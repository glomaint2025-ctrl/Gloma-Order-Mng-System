<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Models;

use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use Illuminate\Database\Eloquent\Model;

/**
 * shop_id = null → global default; a shop row overrides it (D46). Not BelongsToShop: global rows have no shop.
 *
 * @property int $id
 * @property ?int $shop_id
 * @property MessageEvent $event
 * @property MessageChannel $channel
 * @property ?string $subject
 * @property string $body
 * @property bool $is_active
 */
class MessageTemplate extends Model
{
    public const PLACEHOLDERS = [
        '{shop_name}', '{customer_name}', '{order_number}', '{total}', '{items}',
        '{courier}', '{tracking_number}', '{tracking_url}',
    ];

    protected $fillable = ['shop_id', 'event', 'channel', 'subject', 'body', 'is_active'];

    protected function casts(): array
    {
        return ['event' => MessageEvent::class, 'channel' => MessageChannel::class, 'is_active' => 'boolean'];
    }
}
