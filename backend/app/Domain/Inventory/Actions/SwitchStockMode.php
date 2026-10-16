<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Actions;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Shops\Enums\StockMode;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * Switches between one shared number and per-location stock (D32, F6). Totals never change; only locations do.
 */
final class SwitchStockMode
{
    public function __construct(private readonly StockLedger $stock, private readonly AuditLogger $audit) {}

    /**
     * @param  array<int, array{gloma: int, shop: int}>  $split  product_id => qty at each place (only when switching to by_location)
     */
    public function handle(Shop $shop, User $actor, StockMode $to, array $split = []): Shop
    {
        if ($shop->stock_mode === $to) {
            throw new BusinessRuleException('same_mode', 'The shop already uses this stock mode.');
        }

        return DB::transaction(function () use ($shop, $actor, $to, $split) {
            $products = Product::query()->orderBy('id')->get();
            $reason = 'Switched to: '.$to->label();

            foreach ($products as $product) {
                $levels = StockLevel::query()->where('product_id', $product->id)->lockForUpdate()->get();
                $total = (int) $levels->sum('qty');

                if ($to === StockMode::ByLocation) {
                    $parts = $split[$product->id] ?? ['gloma' => $total, 'shop' => 0];
                    if ((int) $parts['gloma'] < 0 || (int) $parts['shop'] < 0 || (int) $parts['gloma'] + (int) $parts['shop'] !== $total) {
                        throw new BusinessRuleException('split_mismatch',
                            "\"{$product->name}\": Gloma + shop must equal the current total of {$total}.", 422);
                    }
                    $targets = [StockLocation::Gloma->value => (int) $parts['gloma'], StockLocation::Shop->value => (int) $parts['shop']];
                } else {
                    $targets = [StockLocation::Shared->value => $total];
                }

                // Empty every current location, then fill the targets.
                foreach ($levels as $level) {
                    if ($level->qty !== 0) {
                        $this->stock->move($product, $level->location, -$level->qty, MovementType::ModeSwitch, $reason, null, $actor->id);
                    }
                }
                foreach ($targets as $location => $qty) {
                    if ($qty !== 0) {
                        $this->stock->move($product, StockLocation::from($location), $qty, MovementType::ModeSwitch, $reason, null, $actor->id);
                    }
                }
            }

            $from = $shop->stock_mode;
            $shop->stock_mode = $to;
            $shop->save();
            $this->audit->log('shop.stock_mode_switched', $shop, ['from' => $from->value, 'to' => $to->value], $shop->id);

            return $shop;
        });
    }
}
