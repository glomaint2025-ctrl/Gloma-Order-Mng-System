<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Inventory\Models\StockMovement;
use App\Support\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * The ONLY way stock changes (CLAUDE.md rule 2).
 * Writes an append-only movement and updates the row-locked level in the same transaction.
 * Callers that move several products must call in ascending product_id order to avoid deadlocks.
 */
final class StockLedger
{
    public function move(
        Product $product,
        StockLocation $location,
        int $qty,
        MovementType $type,
        ?string $reason = null,
        ?Model $source = null,
        ?int $userId = null,
    ): StockMovement {
        if ($qty === 0) {
            throw new \InvalidArgumentException('A stock movement needs a non-zero quantity.');
        }

        return DB::transaction(function () use ($product, $location, $qty, $type, $reason, $source, $userId) {
            $level = $this->lockLevel($product, $location);

            if ($level->qty + $qty < 0) {
                throw new BusinessRuleException(
                    'insufficient_stock',
                    sprintf('Only %d left of "%s" (%s).', $level->qty, $product->name, $location->label()),
                );
            }

            $level->qty += $qty;
            $level->save();

            return StockMovement::create([
                'shop_id' => $product->shop_id,
                'product_id' => $product->id,
                'location' => $location,
                'qty' => $qty,
                'type' => $type,
                'reason' => $reason,
                'source_type' => $source ? class_basename($source) : null,
                'source_id' => $source?->getKey(),
                'user_id' => $userId ?? auth()->id(),
            ]);
        });
    }

    public function available(Product $product, StockLocation $location): int
    {
        return (int) StockLevel::withoutGlobalScopes()
            ->where('product_id', $product->id)
            ->where('location', $location->value)
            ->value('qty');
    }

    /** Row-locks (SELECT ... FOR UPDATE) the level row, creating it when missing. */
    private function lockLevel(Product $product, StockLocation $location): StockLevel
    {
        $query = fn () => StockLevel::withoutGlobalScopes()
            ->where('product_id', $product->id)
            ->where('location', $location->value)
            ->lockForUpdate()
            ->first();

        $level = $query();
        if ($level === null) {
            StockLevel::withoutGlobalScopes()->insertOrIgnore([
                'shop_id' => $product->shop_id,
                'product_id' => $product->id,
                'location' => $location->value,
                'qty' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $level = $query();
        }

        /** @var StockLevel $level */
        return $level;
    }
}
