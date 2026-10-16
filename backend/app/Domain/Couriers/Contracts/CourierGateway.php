<?php

declare(strict_types=1);

namespace App\Domain\Couriers\Contracts;

use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Orders\Models\Order;

/**
 * One interface for every courier. Phase 1 = manual adapter (typed tracking number + URL pattern).
 * Phase 3 = API adapters (create shipment, poll status) behind the same interface.
 */
interface CourierGateway
{
    /** Registers the hand-over. Returns the tracking number to store (the manual adapter echoes the typed one). */
    public function createShipment(Order $order, CourierAccount $account, ?string $trackingNumber): string;

    public function trackingUrl(CourierAccount $account, string $trackingNumber): string;
}
