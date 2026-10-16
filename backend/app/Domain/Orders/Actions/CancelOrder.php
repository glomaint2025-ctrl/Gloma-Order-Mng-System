<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Customers\Services\CustomerService;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderDraft;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Cancels before dispatch (F4). Reason required; all stock goes back. */
final class CancelOrder
{
    public function __construct(
        private readonly OrderRecorder $recorder,
        private readonly OrderRules $rules,
        private readonly StockLedger $stock,
        private readonly CustomerService $customers,
    ) {}

    public function handle(Shop $shop, User $actor, Order $order, string $reason): Order
    {
        return DB::transaction(function () use ($shop, $actor, $order, $reason) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, OrderRules::CANCEL);
            $order->load('items.product');

            $changes = OrderDraft::netChanges($order->items->map(fn ($item) => [
                'product' => $item->product,
                'location' => $item->location->remap($shop->stock_mode, $order->seller),
                'qty' => $item->qty,
            ]));
            foreach ($changes as $change) {
                $this->stock->move($change['product'], $change['location'], $change['qty'], MovementType::OrderCancel,
                    $order->number, $order, $actor->id);
            }

            $order->cancel_reason = $reason;
            $this->recorder->transition($order, OrderStatus::Cancelled, 'cancelled', ['reason' => $reason]);
            $this->customers->recount($order->customer_id);

            return $order->refresh();
        });
    }
}
