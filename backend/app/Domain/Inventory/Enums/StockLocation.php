<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Enums;

use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Enums\StockMode;
use App\Support\HasLabels;

enum StockLocation: string
{
    use HasLabels;

    /** The one pool used when the shop's stock mode is "single". */
    case Shared = 'shared';
    case Gloma = 'gloma';
    case Shop = 'shop';

    public function label(): string
    {
        return match ($this) {
            self::Shared => 'Shared stock',
            self::Gloma => 'At Gloma',
            self::Shop => 'At the shop',
        };
    }

    /** @return list<self> */
    public static function forMode(StockMode $mode): array
    {
        return $mode === StockMode::Single ? [self::Shared] : [self::Gloma, self::Shop];
    }

    /** Where a seller's order takes stock from. */
    public static function forSale(StockMode $mode, Party $seller): self
    {
        if ($mode === StockMode::Single) {
            return self::Shared;
        }

        return $seller === Party::Gloma ? self::Gloma : self::Shop;
    }

    /**
     * Where stock taken from this location goes back to under the shop's current mode
     * (the mode may have been switched since the order was placed).
     */
    public function remap(StockMode $mode, Party $seller): self
    {
        return $this->validFor($mode) ? $this : self::forSale($mode, $seller);
    }

    public function validFor(StockMode $mode): bool
    {
        return in_array($this, self::forMode($mode), true);
    }
}
