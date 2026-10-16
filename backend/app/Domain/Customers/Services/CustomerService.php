<?php

declare(strict_types=1);

namespace App\Domain\Customers\Services;

use App\Domain\Customers\Models\Customer;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Models\User;

final class CustomerService
{
    /**
     * Find-or-create the shop's customer by phone and refresh contact details.
     *
     * @param  array{name: string, email?: ?string, address?: ?string, city?: ?string}  $details
     */
    public function upsert(int $shopId, string $phone, array $details): Customer
    {
        /** @var Customer $customer */
        $customer = Customer::withoutGlobalScopes()->firstOrNew(['shop_id' => $shopId, 'phone' => $phone]);
        $customer->fill(array_filter([
            'name' => $details['name'],
            'email' => $details['email'] ?? null,
            'address' => $details['address'] ?? null,
            'city' => $details['city'] ?? null,
        ], fn ($v) => $v !== null && $v !== ''));
        $customer->shop_id = $shopId;
        $customer->anonymized_at = null;
        $customer->save();

        return $customer;
    }

    public function recount(?int $customerId): void
    {
        if ($customerId === null) {
            return;
        }
        $base = Order::withoutGlobalScopes()->where('customer_id', $customerId);
        Customer::withoutGlobalScopes()->whereKey($customerId)->update([
            'orders_count' => (clone $base)->where('status', '!=', OrderStatus::Cancelled->value)->count(),
            'returns_count' => (clone $base)->where('status', OrderStatus::Returned->value)->count(),
        ]);
    }

    /**
     * Warnings shown when ordering for this customer (D19, D43). They never block.
     *
     * @return list<array{code: string, level: string, message: string}>
     */
    public function warnings(?Customer $customer, User $viewer, ?int $excludeOrderId = null): array
    {
        if ($customer === null) {
            return [];
        }

        $warnings = [];
        $orders = Order::withoutGlobalScopes()->where('customer_id', $customer->id)
            ->when($excludeOrderId, fn ($q) => $q->whereKeyNot($excludeOrderId));
        $returned = (clone $orders)->where('status', OrderStatus::Returned->value)->count();
        $total = (clone $orders)->where('status', '!=', OrderStatus::Cancelled->value)->count();

        if ($returned > 0) {
            $warnings[] = [
                'code' => 'returned_before',
                'level' => 'warning',
                'message' => sprintf('Returned %d of %d earlier order%s.', $returned, $total, $total === 1 ? '' : 's'),
            ];
        }

        if ($customer->is_risky) {
            $warnings[] = [
                'code' => 'flagged_risky',
                'level' => 'danger',
                'message' => 'Flagged as risky'.($customer->risk_note ? ': '.$customer->risk_note : '.'),
            ];
        }

        // Gloma admin also sees returns this phone made at other shops (D44).
        if ($viewer->isGlomaAdmin()) {
            $elsewhere = Order::withoutGlobalScopes()
                ->where('customer_phone', $customer->phone)
                ->where('shop_id', '!=', $customer->shop_id)
                ->where('status', OrderStatus::Returned->value)
                ->count();
            if ($elsewhere > 0) {
                $warnings[] = [
                    'code' => 'returned_other_shops',
                    'level' => 'warning',
                    'message' => sprintf('Returned %d order%s at other shops (visible to Gloma only).', $elsewhere, $elsewhere === 1 ? '' : 's'),
                ];
            }
        }

        return $warnings;
    }
}
