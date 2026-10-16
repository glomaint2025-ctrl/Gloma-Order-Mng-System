<?php

declare(strict_types=1);

namespace App\Domain\Orders\Support;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderEvent;

/**
 * Timeline + audit for order changes, and the row lock used by every transition.
 */
final class OrderRecorder
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** Re-reads the order with SELECT ... FOR UPDATE. Call inside a transaction. */
    public function lock(Order $order): Order
    {
        /** @var Order $locked */
        $locked = Order::withoutGlobalScopes()->whereKey($order->id)->lockForUpdate()->firstOrFail();

        return $locked;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public function record(Order $order, string $type, ?OrderStatus $from = null, ?OrderStatus $to = null, array $meta = []): void
    {
        OrderEvent::create([
            'order_id' => $order->id,
            'user_id' => auth()->id(),
            'type' => $type,
            'from_status' => $from?->value,
            'to_status' => $to?->value,
            'meta' => $meta === [] ? null : $meta,
        ]);

        $this->audit->log('order.'.$type, $order, array_filter([
            'from' => $from?->value,
            'to' => $to?->value,
            'meta' => $meta ?: null,
        ]), $order->shop_id);
    }

    /** Moves the order to a new status, stamps the matching *_at column and records the event. */
    public function transition(Order $order, OrderStatus $to, string $type, array $meta = []): void
    {
        $from = $order->status;
        $order->status = $to;
        $stamp = match ($to) {
            OrderStatus::Processing => 'confirmed_at',
            OrderStatus::Packed => 'packed_at',
            OrderStatus::Dispatched => 'dispatched_at',
            OrderStatus::Delivered, OrderStatus::Completed => 'delivered_at',
            OrderStatus::Returned => 'returned_at',
            OrderStatus::Cancelled => 'cancelled_at',
            default => null,
        };
        if ($stamp !== null) {
            $order->{$stamp} = now();
        }
        $order->version++;
        $order->save();

        $this->record($order, $type, $from, $to, $meta);
    }
}
