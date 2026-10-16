<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Customers\Services\CustomerService;
use App\Domain\Finance\Services\PaymentRecorder;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Services\Notifier;
use App\Domain\Orders\Enums\OrderChannel;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\PaymentStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderDraft;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Shops\Models\Shop;
use App\Domain\Users\Perm;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * Places a delivery order or a walk-in sale (F2, F3).
 * Stock goes down at once (D15), at the seller's location (D32), inside one transaction with row locks.
 */
final class PlaceOrder
{
    public function __construct(
        private readonly StockLedger $stock,
        private readonly CustomerService $customers,
        private readonly OrderRecorder $recorder,
        private readonly PaymentRecorder $payments,
        private readonly Notifier $notifier,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreOrderRequest data
     */
    public function handle(Shop $shop, User $actor, array $data): Order
    {
        if (! $actor->can(Perm::ORDERS_PLACE)) {
            throw new BusinessRuleException('forbidden', 'You are not allowed to place orders.', 403);
        }
        if ($shop->isClosed()) {
            throw new BusinessRuleException('shop_closed', 'This shop is closed. No new orders.');
        }

        $channel = OrderChannel::from($data['channel'] ?? OrderChannel::Delivery->value);
        $draft = OrderDraft::fromInput($shop->id, $channel, $data);
        foreach ($draft->lines as $line) {
            if (! $line['product']->is_active) {
                throw new BusinessRuleException('inactive_product', "\"{$line['product']->name}\" is no longer sold.", 422);
            }
        }

        $seller = $actor->party();
        $location = StockLocation::forSale($shop->stock_mode, $seller);

        $order = DB::transaction(function () use ($shop, $actor, $data, $channel, $draft, $seller, $location) {
            /** @var Shop $lockedShop */
            $lockedShop = Shop::query()->whereKey($shop->id)->lockForUpdate()->firstOrFail();
            $lockedShop->order_seq++;
            $lockedShop->save();

            $customer = $draft->customer
                ? $this->customers->upsert($shop->id, $draft->customer['phone'], $draft->customer)
                : null;

            $order = Order::create([
                'shop_id' => $shop->id,
                'number' => sprintf('%s-%06d', $lockedShop->code, $lockedShop->order_seq),
                'channel' => $channel,
                'seller' => $seller,
                'placed_by_user_id' => $actor->id,
                'customer_id' => $customer?->id,
                'customer_name' => $draft->customer['name'] ?? null,
                'customer_phone' => $draft->customer['phone'] ?? null,
                'customer_email' => $draft->customer['email'] ?? null,
                'delivery_address' => $draft->customer['address'] ?? null,
                'delivery_city' => $draft->customer['city'] ?? null,
                'status' => $channel === OrderChannel::WalkIn ? OrderStatus::Completed : OrderStatus::AwaitingConfirmation,
                'payment_status' => PaymentStatus::Unpaid,
                'payment_method_id' => $draft->paymentMethod->id,
                'subtotal' => $draft->subtotal,
                'discount' => $draft->discount,
                'delivery_fee' => $draft->deliveryFee,
                'total' => $draft->total,
                'delivered_at' => $channel === OrderChannel::WalkIn ? now() : null,
            ]);

            foreach ($draft->lines as $line) {
                $order->items()->create([
                    'product_id' => $line['product']->id,
                    'sku' => $line['product']->sku,
                    'name' => $line['product']->name,
                    'location' => $location,
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['product']->avg_cost,
                    'line_total' => $line['line_total'],
                ]);
            }

            $changes = OrderDraft::netChanges(array_map(
                fn ($l) => ['product' => $l['product'], 'location' => $location, 'qty' => -$l['qty']],
                $draft->lines,
            ));
            foreach ($changes as $change) {
                $this->stock->move($change['product'], $change['location'], $change['qty'], MovementType::OrderOut,
                    $order->number, $order, $actor->id);
            }

            $this->recorder->record($order, 'placed', null, $order->status, ['seller' => $seller->value]);

            if (! empty($data['note'])) {
                $order->notes()->create(['user_id' => $actor->id, 'body' => (string) $data['note']]);
            }

            if ($channel === OrderChannel::WalkIn) {
                $this->payments->pay($order, null, null, null);
            }

            $this->customers->recount($customer?->id);

            return $order;
        });

        if ($channel === OrderChannel::Delivery) {
            $this->notifier->orderEvent($order, MessageEvent::OrderPlaced);
        }

        return $order->refresh();
    }
}
