<?php

declare(strict_types=1);

namespace App\Domain\Shops\Enums;

use App\Support\HasLabels;

enum ShopStatus: string
{
    use HasLabels;

    case Active = 'active';
    case Suspended = 'suspended';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Suspended => 'Suspended',
            self::Closed => 'Closed (read-only)',
        };
    }
}
