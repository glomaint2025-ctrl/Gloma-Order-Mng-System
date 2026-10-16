<?php

declare(strict_types=1);

namespace App\Domain\Orders\Enums;

use App\Support\HasLabels;

enum PaymentStatus: string
{
    use HasLabels;

    case Unpaid = 'unpaid';
    case Paid = 'paid';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Unpaid => 'Not paid',
            self::Paid => 'Paid',
            self::Refunded => 'Refunded',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::Unpaid => 'warning',
            self::Paid => 'success',
            self::Refunded => 'neutral',
        };
    }
}
