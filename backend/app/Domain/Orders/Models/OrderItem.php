<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\StockLocation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Snapshot of what was sold: name, price and cost at the moment of the order.
 *
 * @property int $id
 * @property int $order_id
 * @property int $product_id
 * @property string $sku
 * @property string $name
 * @property StockLocation $location
 * @property int $qty
 * @property string $unit_price
 * @property string $unit_cost
 * @property string $line_total
 * @property int $returned_good_qty
 * @property int $returned_damaged_qty
 * @property Product $product
 */
class OrderItem extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'location' => StockLocation::class,
            'qty' => 'integer',
            'unit_price' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
            'returned_good_qty' => 'integer',
            'returned_damaged_qty' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
