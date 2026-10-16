<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Shops\Tenancy\BelongsToShop;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An invested item (D31).
 *
 * @property int $id
 * @property int $shop_id
 * @property string $sku
 * @property string $name
 * @property ?string $description
 * @property string $price
 * @property string $avg_cost
 * @property bool $is_active
 */
class Product extends Model
{
    use BelongsToShop;

    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    protected $fillable = ['shop_id', 'sku', 'name', 'description', 'price', 'avg_cost', 'is_active'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'avg_cost' => 'decimal:2', 'is_active' => 'boolean'];
    }

    /** @return HasMany<StockLevel, $this> */
    public function stockLevels(): HasMany
    {
        return $this->hasMany(StockLevel::class);
    }

    public function totalStock(): int
    {
        return (int) $this->stockLevels->sum('qty');
    }

    protected static function newFactory(): ProductFactory
    {
        return ProductFactory::new();
    }
}
