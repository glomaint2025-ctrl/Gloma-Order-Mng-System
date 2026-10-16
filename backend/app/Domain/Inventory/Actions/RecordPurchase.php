<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Actions;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Catalog\Models\Product;
use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Services\MoneyLedger;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockPurchase;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

/**
 * Gloma records stock bought with the shop's money (D35): stock in, weighted average cost updated, purchase cost in the ledger.
 */
final class RecordPurchase
{
    public function __construct(
        private readonly StockLedger $stock,
        private readonly MoneyLedger $ledger,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  array{reference?: ?string, supplier?: ?string, purchased_on: string, notes?: ?string,
     *     lines: list<array{product_id: int, qty: int, unit_cost: string|int|float, location?: ?string}>}  $data
     */
    public function handle(Shop $shop, User $actor, array $data): StockPurchase
    {
        return DB::transaction(function () use ($shop, $actor, $data) {
            $products = Product::query()->whereIn('id', array_column($data['lines'], 'product_id'))->get()->keyBy('id');

            $lines = [];
            $total = '0.00';
            foreach ($data['lines'] as $line) {
                $product = $products->get((int) $line['product_id']);
                if ($product === null) {
                    throw new BusinessRuleException('invalid_product', 'One of the products is not in this shop.', 422);
                }
                $location = isset($line['location']) && $line['location'] !== ''
                    ? StockLocation::from($line['location'])
                    : StockLocation::forMode($shop->stock_mode)[0];
                if (! $location->validFor($shop->stock_mode)) {
                    throw new BusinessRuleException('invalid_location', "Location \"{$location->label()}\" is not used in this shop's stock mode.", 422);
                }
                $unitCost = Money::of((string) $line['unit_cost']);
                $lineTotal = Money::mul($unitCost, (int) $line['qty']);
                $total = Money::add($total, $lineTotal);
                $lines[] = compact('product', 'location', 'unitCost', 'lineTotal') + ['qty' => (int) $line['qty']];
            }

            $purchase = StockPurchase::create([
                'shop_id' => $shop->id,
                'reference' => $data['reference'] ?? null,
                'supplier' => $data['supplier'] ?? null,
                'purchased_on' => $data['purchased_on'],
                'total' => $total,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            usort($lines, fn ($a, $b) => $a['product']->id <=> $b['product']->id);
            foreach ($lines as $line) {
                /** @var Product $product */
                $product = Product::query()->whereKey($line['product']->id)->lockForUpdate()->firstOrFail();
                $onHand = max(0, (int) $product->stockLevels()->sum('qty'));
                $product->avg_cost = Money::weightedAverage($onHand, $product->avg_cost, $line['qty'], $line['unitCost']);
                $product->save();

                $purchase->lines()->create([
                    'product_id' => $product->id,
                    'location' => $line['location'],
                    'qty' => $line['qty'],
                    'unit_cost' => $line['unitCost'],
                    'line_total' => $line['lineTotal'],
                ]);
                $this->stock->move($product, $line['location'], $line['qty'], MovementType::PurchaseIn,
                    $purchase->reference ?: "Purchase #{$purchase->id}", $purchase, $actor->id);
            }

            $this->ledger->record($shop->id, LedgerType::Purchase, $total, null,
                trim('Stock purchase '.($purchase->reference ?? "#{$purchase->id}").' '.($purchase->supplier ?? '')),
                ['stock_purchase_id' => $purchase->id, 'occurred_on' => $data['purchased_on']], $actor->id);

            $this->audit->log('purchase.recorded', $purchase, ['total' => $total, 'lines' => count($lines)]);

            return $purchase->load('lines.product');
        });
    }
}
