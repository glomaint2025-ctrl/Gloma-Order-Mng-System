<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Customers\Services\CustomerService;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderDraft;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * Edits an order until it is packed (D16). Optimistic lock on `version` stops two people overwriting each other.
 */
final class UpdateOrder
{
    public function __construct(
        private readonly StockLedger $stock,
        private readonly CustomerService $customers,
        private readonly OrderRecorder $recorder,
        private readonly OrderRules $rules,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated UpdateOrderRequest data (includes `version`)
     */
    public function handle(Shop $shop, User $actor, Order $order, array $data): Order
    {
        return DB::transaction(function () use ($shop, $actor, $order, $data) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, OrderRules::EDIT);

            if ((int) $data['version'] !== $order->version) {
                throw new BusinessRuleException('stale_version', 'Someone else changed this order. Reload it and try again.');
            }

            $draft = OrderDraft::fromInput($shop->id, $order->channel, $data);
            $order->load('items.product');
            $existing = $order->items->pluck('product_id')->all();
            foreach ($draft->lines as $line) {
                if (! $line['product']->is_active && ! in_array($line['product']->id, $existing, true)) {
                    throw new BusinessRuleException('inactive_product', "\"{$line['product']->name}\" is no longer sold.", 422);
                }
            }

            $saleLocation = StockLocation::forSale($shop->stock_mode, $order->seller);
            $changes = [];
            foreach ($order->items as $item) {
                $changes[] = ['product' => $item->product, 'location' => $item->location->remap($shop->stock_mode, $order->seller), 'qty' => $item->qty];
            }
            foreach ($draft->lines as $line) {
                $changes[] = ['product' => $line['product'], 'location' => $saleLocation, 'qty' => -$line['qty']];
            }
            foreach (OrderDraft::netChanges($changes) as $change) {
                $this->stock->move($change['product'], $change['location'], $change['qty'], MovementType::OrderEdit,
                    $order->number, $order, $actor->id);
            }

            $before = $order->only(['total', 'customer_phone', 'delivery_address']);
            $oldCustomerId = $order->customer_id;

            $order->items()->delete();
            foreach ($draft->lines as $line) {
                $order->items()->create([
                    'product_id' => $line['product']->id,
                    'sku' => $line['product']->sku,
                    'name' => $line['product']->name,
                    'location' => $saleLocation,
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['product']->avg_cost,
                    'line_total' => $line['line_total'],
                ]);
            }

            $customer = $draft->customer
                ? $this->customers->upsert($shop->id, $draft->customer['phone'], $draft->customer)
                : null;

            $order->fill([
                'customer_id' => $customer?->id,
                'customer_name' => $draft->customer['name'] ?? null,
                'customer_phone' => $draft->customer['phone'] ?? null,
                'customer_email' => $draft->customer['email'] ?? null,
                'delivery_address' => $draft->customer['address'] ?? null,
                'delivery_city' => $draft->customer['city'] ?? null,
                'payment_method_id' => $draft->paymentMethod->id,
                'subtotal' => $draft->subtotal,
                'discount' => $draft->discount,
                'delivery_fee' => $draft->deliveryFee,
                'total' => $draft->total,
            ]);
            $order->version++;
            $order->save();

            $this->customers->recount($oldCustomerId);
            if ($customer && $customer->id !== $oldCustomerId) {
                $this->customers->recount($customer->id);
            }

            $this->recorder->record($order, 'edited', meta: [
                'before' => $before,
                'after' => $order->only(['total', 'customer_phone', 'delivery_address']),
            ]);

            return $order->refresh();
        });
    }
}
