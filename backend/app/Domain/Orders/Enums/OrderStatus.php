<?php

declare(strict_types=1);

namespace App\Domain\Orders\Enums;

use App\Support\HasLabels;

/** Fulfilment pipeline (D42). Payment is tracked separately in PaymentStatus. */
enum OrderStatus: string
{
    use HasLabels;

    case AwaitingConfirmation = 'awaiting_confirmation';
    case Processing = 'processing';
    case Packed = 'packed';
    case Dispatched = 'dispatched';
    case Delivered = 'delivered';
    case Returned = 'returned';
    case Cancelled = 'cancelled';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::AwaitingConfirmation => 'Awaiting confirmation',
            self::Processing => 'Processing',
            self::Packed => 'Packed',
            self::Dispatched => 'Dispatched',
            self::Delivered => 'Delivered',
            self::Returned => 'Returned',
            self::Cancelled => 'Cancelled',
            self::Completed => 'Completed (walk-in)',
        };
    }

    /** Colour hint for a status badge, so the UI does not map statuses itself. */
    public function tone(): string
    {
        return match ($this) {
            self::AwaitingConfirmation => 'warning',
            self::Processing, self::Packed => 'info',
            self::Dispatched => 'primary',
            self::Delivered, self::Completed => 'success',
            self::Returned, self::Cancelled => 'danger',
        };
    }

    public function isEditable(): bool
    {
        return in_array($this, [self::AwaitingConfirmation, self::Processing], true);
    }

    public function isCancellable(): bool
    {
        return in_array($this, [self::AwaitingConfirmation, self::Processing, self::Packed], true);
    }

    /** Counts as a sale in reports. */
    public function isSold(): bool
    {
        return in_array($this, [self::Delivered, self::Completed], true);
    }

    /** @return list<string> */
    public static function soldValues(): array
    {
        return [self::Delivered->value, self::Completed->value];
    }
}
