<?php

declare(strict_types=1);

namespace App\Domain\Customers\Services;

use App\Domain\Customers\Models\Customer;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderNote;
use Illuminate\Support\Facades\DB;

/**
 * PDPA (Act No. 9 of 2022) data-subject requests: export everything held about one customer, or erase it.
 * Erasing removes identity and contact details but keeps order amounts, items and the money ledger,
 * which are business/tax records. Used by the admin API and by the monthly retention job.
 */
final class CustomerPrivacy
{
    /** @return array<string, mixed> */
    public function export(Customer $customer): array
    {
        $orders = Order::withoutGlobalScopes()->where('customer_id', $customer->id)
            ->with('items:id,order_id,name,sku,qty,unit_price,line_total', 'notes:id,order_id,body,created_at')
            ->orderBy('id')->get();

        $messages = MessageLog::withoutGlobalScopes()
            ->where(fn ($q) => $q->whereIn('order_id', $orders->pluck('id'))
                ->orWhere('recipient', $customer->phone)
                ->when($customer->email, fn ($w) => $w->orWhere('recipient', $customer->email)))
            ->orderBy('id')->get(['channel', 'event', 'recipient', 'body', 'status', 'created_at']);

        return [
            'generated_at' => now()->toIso8601String(),
            'controller' => config('portal.company_name'),
            'customer' => $customer->only(['name', 'phone', 'email', 'address', 'city', 'is_risky', 'risk_note', 'orders_count', 'returns_count', 'created_at', 'updated_at']),
            'orders' => $orders->map(fn (Order $o) => [
                'number' => $o->number,
                'placed_at' => $o->created_at->toIso8601String(),
                'status' => $o->status->label(),
                'name' => $o->customer_name,
                'phone' => $o->customer_phone,
                'email' => $o->customer_email,
                'address' => $o->delivery_address,
                'city' => $o->delivery_city,
                'items' => $o->items->map(fn ($i) => ['name' => $i->name, 'qty' => $i->qty, 'unit_price' => $i->unit_price])->all(),
                'total' => $o->total,
                'tracking_number' => $o->tracking_number,
                'return_reason' => $o->return_reason,
                'notes' => $o->notes->pluck('body')->all(),
            ])->all(),
            'messages_sent' => $messages->toArray(),
        ];
    }

    /** Irreversible. Returns the number of orders whose snapshots were cleared. */
    public function erase(Customer $customer): int
    {
        return DB::transaction(function () use ($customer) {
            $orderIds = Order::withoutGlobalScopes()->where('customer_id', $customer->id)->pluck('id');
            $contacts = array_filter([$customer->phone, $customer->email]);

            Order::withoutGlobalScopes()->whereIn('id', $orderIds)->update([
                'customer_name' => 'Removed', 'customer_phone' => null, 'customer_email' => null,
                'delivery_address' => null, 'delivery_city' => null,
            ]);
            OrderNote::query()->whereIn('order_id', $orderIds)->update(['body' => '[removed for privacy]']);
            MessageLog::withoutGlobalScopes()
                ->where(fn ($q) => $q->whereIn('order_id', $orderIds)->orWhereIn('recipient', $contacts))
                ->update(['recipient' => 'removed', 'body' => '[removed for privacy]']);

            $customer->forceFill([
                'name' => 'Removed',
                'phone' => 'anon-'.substr(hash('sha256', $customer->phone.$customer->id), 0, 12),
                'email' => null, 'address' => null, 'city' => null, 'risk_note' => null, 'is_risky' => false,
                'anonymized_at' => now(),
            ])->save();

            return $orderIds->count();
        });
    }
}
