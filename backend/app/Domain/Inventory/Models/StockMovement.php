<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Models;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Shops\Tenancy\BelongsToShop;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only stock ledger row. Never updated or deleted.
 *
 * @property int $id
 * @property int $shop_id
 * @property int $product_id
 * @property StockLocation $location
 * @property int $qty
 * @property MovementType $type
 * @property ?string $reason
 * @property ?string $source_type
 * @property ?int $source_id
 */
class StockMovement extends Model
{
    use BelongsToShop;

    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['location' => StockLocation::class, 'type' => MovementType::class, 'qty' => 'integer'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
