<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Enums;

use App\Support\HasLabels;

enum MessageEvent: string
{
    use HasLabels;

    case OrderPlaced = 'order_placed';
    case OrderDispatched = 'order_dispatched';

    public function label(): string
    {
        return match ($this) {
            self::OrderPlaced => 'Order placed (e-bill)',
            self::OrderDispatched => 'Order dispatched (tracking)',
        };
    }

    /** @return list<MessageChannel> */
    public function channels(): array
    {
        return match ($this) {
            self::OrderPlaced => [MessageChannel::Email],
            self::OrderDispatched => [MessageChannel::Sms, MessageChannel::Email],
        };
    }
}
