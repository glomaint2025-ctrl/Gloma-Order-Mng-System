<?php

declare(strict_types=1);

namespace App\Domain\Customers\Models;

use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Tenancy\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A shop's customer, unique per shop by E.164 phone (D44: history is per shop).
 *
 * @property int $id
 * @property int $shop_id
 * @property string $phone
 * @property string $name
 * @property ?string $email
 * @property ?string $address
 * @property ?string $city
 * @property bool $is_risky
 * @property ?string $risk_note
 * @property int $orders_count
 * @property int $returns_count
 * @property ?Carbon $anonymized_at
 */
class Customer extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'phone', 'name', 'email', 'address', 'city', 'is_risky', 'risk_note'];

    protected function casts(): array
    {
        return [
            'is_risky' => 'boolean',
            'orders_count' => 'integer',
            'returns_count' => 'integer',
            'anonymized_at' => 'datetime',
        ];
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
