<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Models;

use App\Domain\Shops\Tenancy\BelongsToShop;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Stock bought by Gloma with the shop's invested money (D35).
 *
 * @property int $id
 * @property int $shop_id
 * @property ?string $reference
 * @property ?string $supplier
 * @property Carbon $purchased_on
 * @property string $total
 * @property ?string $notes
 */
class StockPurchase extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'reference', 'supplier', 'purchased_on', 'total', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['purchased_on' => 'date', 'total' => 'decimal:2'];
    }

    /** @return HasMany<StockPurchaseLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(StockPurchaseLine::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
