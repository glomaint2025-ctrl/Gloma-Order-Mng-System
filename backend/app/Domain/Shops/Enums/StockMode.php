<?php

declare(strict_types=1);

namespace App\Domain\Shops\Enums;

use App\Support\HasLabels;

enum StockMode: string
{
    use HasLabels;

    /** One shared quantity for Gloma and the shop (default, D12). */
    case Single = 'single';

    /** Quantities kept per location; each side sells only from its own place (D32). */
    case ByLocation = 'by_location';

    public function label(): string
    {
        return match ($this) {
            self::Single => 'One shared stock number',
            self::ByLocation => 'Separate stock at Gloma and at the shop',
        };
    }
}
