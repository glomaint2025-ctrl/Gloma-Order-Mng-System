<?php

declare(strict_types=1);

namespace App\Domain\Orders\Enums;

use App\Support\HasLabels;

enum OrderChannel: string
{
    use HasLabels;

    case Delivery = 'delivery';
    case WalkIn = 'walk_in';

    public function label(): string
    {
        return match ($this) {
            self::Delivery => 'Delivery',
            self::WalkIn => 'Walk-in',
        };
    }
}
