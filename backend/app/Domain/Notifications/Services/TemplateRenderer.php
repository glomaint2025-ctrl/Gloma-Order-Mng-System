<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Models\MessageTemplate;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Models\Shop;
use App\Support\Money;

final class TemplateRenderer
{
    /** Shop override first, then the global default. Null when none is active. */
    public function resolve(Shop $shop, MessageEvent $event, MessageChannel $channel): ?MessageTemplate
    {
        return MessageTemplate::query()
            ->where('event', $event->value)
            ->where('channel', $channel->value)
            ->where(fn ($q) => $q->where('shop_id', $shop->id)->orWhereNull('shop_id'))
            ->orderByRaw('shop_id is null') // shop row (0) before global (1)
            ->get()
            ->first(fn (MessageTemplate $t) => $t->is_active);
    }

    public function render(string $text, Order $order, Shop $shop): string
    {
        $order->loadMissing('items', 'courierAccount.courier');

        $items = $order->items->map(fn ($i) => "{$i->name} x{$i->qty}")->implode(', ');

        return strtr($text, [
            '{shop_name}' => $shop->name,
            '{customer_name}' => (string) $order->customer_name,
            '{order_number}' => $order->number,
            '{total}' => 'Rs. '.number_format((float) Money::of($order->total), 2),
            '{items}' => $items,
            '{courier}' => (string) $order->courierAccount?->courier->name,
            '{tracking_number}' => (string) $order->tracking_number,
            '{tracking_url}' => (string) $order->tracking_url,
        ]);
    }
}
