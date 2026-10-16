<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Customers\Models\Customer;
use App\Domain\Finance\Models\Payment;
use App\Domain\Orders\Enums\OrderChannel;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\PaymentStatus;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Tenancy\BelongsToShop;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $shop_id
 * @property string $number
 * @property OrderChannel $channel
 * @property Party $seller
 * @property ?int $placed_by_user_id
 * @property ?int $customer_id
 * @property ?string $customer_name
 * @property ?string $customer_phone
 * @property ?string $customer_email
 * @property ?string $delivery_address
 * @property ?string $delivery_city
 * @property OrderStatus $status
 * @property PaymentStatus $payment_status
 * @property ?int $payment_method_id
 * @property string $subtotal
 * @property string $discount
 * @property string $delivery_fee
 * @property string $total
 * @property ?int $courier_account_id
 * @property ?string $tracking_number
 * @property ?string $tracking_url
 * @property ?string $courier_charge
 * @property ?string $cancel_reason
 * @property ?string $return_reason
 * @property ?string $return_charge
 * @property ?Carbon $confirmed_at
 * @property ?Carbon $packed_at
 * @property ?Carbon $dispatched_at
 * @property ?Carbon $delivered_at
 * @property ?Carbon $returned_at
 * @property ?Carbon $cancelled_at
 * @property ?Carbon $paid_at
 * @property int $version
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property ?Customer $customer
 * @property ?PaymentMethod $paymentMethod
 * @property ?CourierAccount $courierAccount
 * @property Collection<int, OrderItem> $items
 */
class Order extends Model
{
    use BelongsToShop;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'channel' => OrderChannel::class,
            'seller' => Party::class,
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total' => 'decimal:2',
            'courier_charge' => 'decimal:2',
            'return_charge' => 'decimal:2',
            'confirmed_at' => 'datetime',
            'packed_at' => 'datetime',
            'dispatched_at' => 'datetime',
            'delivered_at' => 'datetime',
            'returned_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'paid_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<OrderEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->orderBy('id');
    }

    /** @return HasMany<OrderNote, $this> */
    public function notes(): HasMany
    {
        return $this->hasMany(OrderNote::class)->latest('id');
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('id');
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<PaymentMethod, $this> */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /** @return BelongsTo<CourierAccount, $this> */
    public function courierAccount(): BelongsTo
    {
        return $this->belongsTo(CourierAccount::class);
    }

    /** @return BelongsTo<User, $this> */
    public function placedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'placed_by_user_id');
    }

    public function isWalkIn(): bool
    {
        return $this->channel === OrderChannel::WalkIn;
    }
}
