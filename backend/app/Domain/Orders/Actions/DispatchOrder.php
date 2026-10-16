<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Couriers\Contracts\CourierGateway;
use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Services\MoneyLedger;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Services\Notifier;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

/**
 * Hand-over to the courier (D20, D21, D22): the seller's own courier account + tracking number → tracking link,
 * optional courier charge to the ledger, then SMS + email to the customer.
 */
final class DispatchOrder
{
    public function __construct(
        private readonly OrderRecorder $recorder,
        private readonly OrderRules $rules,
        private readonly CourierGateway $couriers,
        private readonly MoneyLedger $ledger,
        private readonly Notifier $notifier,
    ) {}

    public function handle(Shop $shop, User $actor, Order $order, int $courierAccountId, ?string $trackingNumber, ?string $courierCharge): Order
    {
        $order = DB::transaction(function () use ($shop, $actor, $order, $courierAccountId, $trackingNumber, $courierCharge) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, OrderRules::DISPATCH);

            $account = $this->accountFor($order, $courierAccountId);
            $tracking = $this->couriers->createShipment($order, $account, $trackingNumber);
            $charge = $courierCharge !== null && $courierCharge !== '' ? Money::of($courierCharge) : $account->default_charge;

            $order->courier_account_id = $account->id;
            $order->tracking_number = $tracking;
            $order->tracking_url = $this->couriers->trackingUrl($account, $tracking);
            $order->courier_charge = $charge;

            $this->recorder->transition($order, OrderStatus::Dispatched, 'dispatched', [
                'courier' => $account->courier->name,
                'tracking_number' => $tracking,
            ]);

            if ($charge !== null && ! Money::isZero($charge)) {
                $this->ledger->record($order->shop_id, LedgerType::CourierCharge, $charge, $order->seller,
                    "Courier charge {$order->number}", ['order_id' => $order->id]);
            }

            return $order;
        });

        $this->notifier->orderEvent($order, MessageEvent::OrderDispatched);

        return $order->refresh();
    }

    private function accountFor(Order $order, int $id): CourierAccount
    {
        /** @var CourierAccount|null $account */
        $account = CourierAccount::with('courier')->whereKey($id)->first();

        $valid = $account !== null && $account->is_active && $account->courier->is_active && (
            $order->seller === Party::Gloma
                ? $account->shop_id === null
                : $account->shop_id === $order->shop_id
        );

        if (! $valid) {
            $whose = $order->seller === Party::Gloma ? "Gloma's" : "the shop's";
            throw new BusinessRuleException('invalid_courier_account', "Choose one of {$whose} active courier accounts.", 422);
        }

        return $account;
    }
}
