<?php

declare(strict_types=1);

namespace App\Domain\Shops\Enums;

use App\Support\HasLabels;

/** The two sides of every deal: Gloma and the partner shop. Used as order seller and ledger party. */
enum Party: string
{
    use HasLabels;

    case Gloma = 'gloma';
    case Shop = 'shop';

    public function label(): string
    {
        return match ($this) {
            self::Gloma => 'Gloma',
            self::Shop => 'Shop',
        };
    }
}
