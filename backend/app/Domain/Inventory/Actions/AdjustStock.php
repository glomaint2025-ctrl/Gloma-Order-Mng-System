<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Actions;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * Admin stock changes with a reason: correction (+/−), damage (−), handover to shop at contract end (−, F5),
 * and transfers between Gloma and the shop (by-location mode).
 */
final class AdjustStock
{
    public function __construct(private readonly StockLedger $stock, private readonly AuditLogger $audit) {}

    public function adjust(Shop $shop, User $actor, Product $product, MovementType $type, StockLocation $location, int $qty, string $reason): StockMovement
    {
        if (! in_array($type, MovementType::manualAdjustments(), true)) {
            throw new BusinessRuleException('invalid_type', 'Choose correction, damage or handover.', 422);
        }
        $this->assertLocation($shop, $location);

        // Damage and handover always take stock out; a correction keeps the sign typed in.
        $signed = $type === MovementType::Correction ? $qty : -abs($qty);
        if ($signed === 0) {
            throw new BusinessRuleException('invalid_qty', 'Quantity cannot be zero.', 422);
        }

        return DB::transaction(function () use ($shop, $actor, $product, $type, $location, $signed, $reason) {
            $movement = $this->stock->move($product, $location, $signed, $type, $reason, null, $actor->id);
            $this->audit->log('stock.'.$type->value, $product, ['location' => $location->value, 'qty' => $signed, 'reason' => $reason], $shop->id);

            return $movement;
        });
    }

    public function transfer(Shop $shop, User $actor, Product $product, StockLocation $from, StockLocation $to, int $qty, ?string $reason): void
    {
        if (! $shop->isByLocation()) {
            throw new BusinessRuleException('wrong_stock_mode', 'Transfers are only used when stock is kept by location.');
        }
        if ($from === $to || $qty <= 0) {
            throw new BusinessRuleException('invalid_transfer', 'Pick two different locations and a quantity above zero.', 422);
        }
        $this->assertLocation($shop, $from);
        $this->assertLocation($shop, $to);

        DB::transaction(function () use ($shop, $actor, $product, $from, $to, $qty, $reason) {
            $text = $reason ?: "{$from->label()} → {$to->label()}";
            $this->stock->move($product, $from, -$qty, MovementType::TransferOut, $text, null, $actor->id);
            $this->stock->move($product, $to, $qty, MovementType::TransferIn, $text, null, $actor->id);
            $this->audit->log('stock.transfer', $product, ['from' => $from->value, 'to' => $to->value, 'qty' => $qty], $shop->id);
        });
    }

    private function assertLocation(Shop $shop, StockLocation $location): void
    {
        if (! $location->validFor($shop->stock_mode)) {
            throw new BusinessRuleException('invalid_location', "Location \"{$location->label()}\" is not used in this shop's stock mode.", 422);
        }
    }
}
