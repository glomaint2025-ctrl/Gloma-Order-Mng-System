<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Models;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\StockLocation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property int $qty
 * @property string $unit_cost
 * @property string $line_total
 * @property StockLocation $location
 */
class StockPurchaseLine extends Model
{
    public $timestamps = false;

    protected $fillable = ['product_id', 'location', 'qty', 'unit_cost', 'line_total'];

    protected function casts(): array
    {
        return [
            'location' => StockLocation::class,
            'qty' => 'integer',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
