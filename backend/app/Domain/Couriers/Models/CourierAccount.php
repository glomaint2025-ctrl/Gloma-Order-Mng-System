<?php

declare(strict_types=1);

namespace App\Domain\Couriers\Models;

use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A courier account. shop_id = null means it is Gloma's own account (D20, D33).
 * Not using BelongsToShop on purpose: Gloma accounts have no shop. Queries filter explicitly.
 *
 * @property int $id
 * @property ?int $shop_id
 * @property int $courier_id
 * @property string $label
 * @property ?string $account_ref
 * @property ?string $default_charge
 * @property bool $is_active
 * @property Courier $courier
 */
class CourierAccount extends Model
{
    protected $fillable = ['shop_id', 'courier_id', 'label', 'account_ref', 'default_charge', 'is_active'];

    protected function casts(): array
    {
        return ['default_charge' => 'decimal:2', 'is_active' => 'boolean'];
    }

    /** @return BelongsTo<Courier, $this> */
    public function courier(): BelongsTo
    {
        return $this->belongsTo(Courier::class);
    }

    /** @return BelongsTo<Shop, $this> */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function owner(): Party
    {
        return $this->shop_id === null ? Party::Gloma : Party::Shop;
    }
}
