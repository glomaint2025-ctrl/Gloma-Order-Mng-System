<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Models;

use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Tenancy\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Every SMS / email sent, per shop, with segments and cost so Gloma can bill shops for SMS (D45).
 *
 * @property int $id
 * @property int $shop_id
 * @property ?int $order_id
 * @property MessageEvent $event
 * @property MessageChannel $channel
 * @property string $recipient
 * @property string $body
 * @property int $segments
 * @property string $cost
 * @property string $status queued|sent|failed|skipped
 * @property ?string $provider_ref
 * @property ?string $error
 * @property int $attempts
 * @property \Illuminate\Support\Carbon $created_at
 */
class MessageLog extends Model
{
    use BelongsToShop;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'event' => MessageEvent::class,
            'channel' => MessageChannel::class,
            'segments' => 'integer',
            'cost' => 'decimal:2',
            'attempts' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
