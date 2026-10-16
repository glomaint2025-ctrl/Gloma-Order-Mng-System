<?php

declare(strict_types=1);

namespace App\Domain\Orders\Enums;

use App\Support\HasLabels;

enum PaymentMethodKind: string
{
    use HasLabels;

    case Cod = 'cod';
    case Prepaid = 'prepaid';

    public function label(): string
    {
        return match ($this) {
            self::Cod => 'Cash on delivery',
            self::Prepaid => 'Paid in advance',
        };
    }
}
