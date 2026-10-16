<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Finance\Services\PaymentRecorder;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The simple one-click steps: confirm (after the confirmation call), pack, and deliver.
 */
final class ChangeOrderStatus
{
    public function __construct(
        private readonly OrderRecorder $recorder,
        private readonly OrderRules $rules,
        private readonly PaymentRecorder $payments,
    ) {}

    public function confirm(Shop $shop, User $actor, Order $order): Order
    {
        return $this->step($shop, $actor, $order, OrderRules::CONFIRM, OrderStatus::Processing, 'confirmed');
    }

    public function pack(Shop $shop, User $actor, Order $order): Order
    {
        return $this->step($shop, $actor, $order, OrderRules::PACK, OrderStatus::Packed, 'packed');
    }

    /** Marks delivered; optionally records the full payment in the same click (COD collected). */
    public function deliver(Shop $shop, User $actor, Order $order, bool $recordPayment = false, ?string $reference = null): Order
    {
        return DB::transaction(function () use ($shop, $actor, $order, $recordPayment, $reference) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, OrderRules::DELIVER);
            $this->recorder->transition($order, OrderStatus::Delivered, 'delivered');

            if ($recordPayment) {
                $this->rules->assert($order, $actor, $shop, OrderRules::RECORD_PAYMENT);
                $this->payments->pay($order, null, $reference, null);
            }

            return $order->refresh();
        });
    }

    private function step(Shop $shop, User $actor, Order $order, string $action, OrderStatus $to, string $type): Order
    {
        return DB::transaction(function () use ($shop, $actor, $order, $action, $to, $type) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, $action);
            $this->recorder->transition($order, $to, $type);

            return $order->refresh();
        });
    }
}
