<?php

declare(strict_types=1);

namespace App\Domain\Finance\Models;

use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Tenancy\BelongsToShop;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Append-only money ledger row (LKR, exact decimals).
 *
 * @property int $id
 * @property int $shop_id
 * @property Party $party
 * @property LedgerType $type
 * @property string $amount
 * @property ?int $order_id
 * @property ?int $stock_purchase_id
 * @property ?string $description
 * @property Carbon $occurred_on
 * @property ?int $created_by
 * @property Carbon $created_at
 */
class LedgerEntry extends Model
{
    use BelongsToShop;

    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'party' => Party::class,
            'type' => LedgerType::class,
            'amount' => 'decimal:2',
            'occurred_on' => 'date',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
