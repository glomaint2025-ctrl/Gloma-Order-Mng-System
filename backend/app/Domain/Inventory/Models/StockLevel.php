<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Models;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Shops\Tenancy\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Projection of stock_movements (sum per product + location). Row-locked whenever stock changes.
 *
 * @property int $id
 * @property int $shop_id
 * @property int $product_id
 * @property StockLocation $location
 * @property int $qty
 */
class StockLevel extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'product_id', 'location', 'qty'];

    protected function casts(): array
    {
        return ['location' => StockLocation::class, 'qty' => 'integer'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
