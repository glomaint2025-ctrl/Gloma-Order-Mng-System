<?php

declare(strict_types=1);

namespace App\Domain\Finance\Models;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\PaymentMethod;
use App\Domain\Shops\Tenancy\BelongsToShop;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property string $kind payment|refund
 * @property string $amount
 * @property ?int $payment_method_id
 * @property ?string $reference
 * @property ?string $slip_path
 * @property Carbon $paid_at
 */
class Payment extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'order_id', 'kind', 'amount', 'payment_method_id', 'reference', 'slip_path', 'recorded_by', 'paid_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_at' => 'datetime'];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<PaymentMethod, $this> */
    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
