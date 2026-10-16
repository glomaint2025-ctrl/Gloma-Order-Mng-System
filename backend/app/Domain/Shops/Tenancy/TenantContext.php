<?php

declare(strict_types=1);

namespace App\Domain\Shops\Tenancy;

use App\Domain\Shops\Models\Shop;

/**
 * The shop the current request works inside. Set only by the `tenant` middleware from the {shop} URL segment.
 */
final class TenantContext
{
    private ?Shop $shop = null;

    public function set(?Shop $shop): void
    {
        $this->shop = $shop;
    }

    public function shop(): ?Shop
    {
        return $this->shop;
    }

    public function id(): ?int
    {
        return $this->shop?->id;
    }

    public function has(): bool
    {
        return $this->shop !== null;
    }
}
