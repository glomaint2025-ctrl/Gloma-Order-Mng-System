<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Customers\Services\CustomerService;
use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Services\MoneyLedger;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

/**
 * Parcel came back (D18): reason required; good items go back to the sender's stock, damaged ones are only recorded.
 */
final class ReturnOrder
{
    public function __construct(
        private readonly OrderRecorder $recorder,
        private readonly OrderRules $rules,
        private readonly StockLedger $stock,
        private readonly MoneyLedger $ledger,
        private readonly CustomerService $customers,
    ) {}

    /**
     * @param  array<int, int>  $damagedByItemId  order_item_id => damaged qty (missing = 0, all good)
     */
    public function handle(Shop $shop, User $actor, Order $order, string $reason, array $damagedByItemId = [], ?string $returnCharge = null): Order
    {
        return DB::transaction(function () use ($shop, $actor, $order, $reason, $damagedByItemId, $returnCharge) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, OrderRules::RETURN);
            $order->load('items.product');

            foreach (array_keys($damagedByItemId) as $itemId) {
                if (! $order->items->contains('id', $itemId)) {
                    throw new BusinessRuleException('invalid_item', 'One of the returned lines is not on this order.', 422);
                }
            }

            $summary = [];
            foreach ($order->items->sortBy('product_id') as $item) {
                $damaged = (int) ($damagedByItemId[$item->id] ?? 0);
                if ($damaged < 0 || $damaged > $item->qty) {
                    throw new BusinessRuleException('invalid_qty', "Damaged qty for \"{$item->name}\" must be between 0 and {$item->qty}.", 422);
                }
                $good = $item->qty - $damaged;
                if ($good > 0) {
                    $this->stock->move($item->product, $item->location->remap($shop->stock_mode, $order->seller), $good,
                        MovementType::ReturnIn, "{$order->number}: {$reason}", $order, $actor->id);
                }
                $item->returned_good_qty = $good;
                $item->returned_damaged_qty = $damaged;
                $item->save();
                $summary[] = ['name' => $item->name, 'good' => $good, 'damaged' => $damaged];
            }

            $order->return_reason = $reason;
            if ($returnCharge !== null && $returnCharge !== '' && ! Money::isZero($returnCharge)) {
                $order->return_charge = Money::of($returnCharge);
                $this->ledger->record($order->shop_id, LedgerType::ReturnCharge, $order->return_charge, $order->seller,
                    "Return charge {$order->number}", ['order_id' => $order->id]);
            }

            $this->recorder->transition($order, OrderStatus::Returned, 'returned', ['reason' => $reason, 'items' => $summary]);
            $this->customers->recount($order->customer_id);

            return $order->refresh();
        });
    }
}
