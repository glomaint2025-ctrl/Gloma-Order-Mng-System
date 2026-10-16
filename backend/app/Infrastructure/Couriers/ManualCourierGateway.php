<?php

declare(strict_types=1);

namespace App\Infrastructure\Couriers;

use App\Domain\Couriers\Contracts\CourierGateway;
use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Orders\Models\Order;
use App\Support\BusinessRuleException;

/**
 * Phase 1 adapter (D21): the user types the tracking number; the link is built from the courier's URL pattern.
 */
final class ManualCourierGateway implements CourierGateway
{
    public function createShipment(Order $order, CourierAccount $account, ?string $trackingNumber): string
    {
        $trackingNumber = trim((string) $trackingNumber);
        if ($trackingNumber === '') {
            throw new BusinessRuleException('tracking_required', 'Enter the tracking number from the courier.', 422);
        }

        return $trackingNumber;
    }

    public function trackingUrl(CourierAccount $account, string $trackingNumber): string
    {
        return str_replace('{tracking}', rawurlencode($trackingNumber), $account->courier->tracking_url_template);
    }
}
