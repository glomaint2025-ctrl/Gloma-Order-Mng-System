<?php

declare(strict_types=1);

namespace App\Domain\Orders\Support;

use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\PaymentStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Models\Shop;
use App\Domain\Users\Perm;
use App\Models\User;
use App\Support\BusinessRuleException;

/**
 * Single source of truth for "what can this user do with this order right now".
 * The API sends the result as `available_actions`; the UI shows only those buttons (D54).
 */
final class OrderRules
{
    public const EDIT = 'edit';

    public const CONFIRM = 'confirm';

    public const PACK = 'pack';

    public const DISPATCH = 'dispatch';

    public const DELIVER = 'deliver';

    public const RETURN = 'return';

    public const CANCEL = 'cancel';

    public const RECORD_PAYMENT = 'record_payment';

    public const REFUND = 'refund';

    public const ADD_NOTE = 'add_note';

    public const PRINT_INVOICE = 'print_invoice';

    public const PRINT_LABEL = 'print_label';

    /** @return list<string> */
    public function availableActions(Order $order, User $user, Shop $shop): array
    {
        $actions = [];
        foreach ([
            self::EDIT, self::CONFIRM, self::PACK, self::DISPATCH, self::DELIVER, self::RETURN,
            self::CANCEL, self::RECORD_PAYMENT, self::REFUND, self::ADD_NOTE, self::PRINT_INVOICE, self::PRINT_LABEL,
        ] as $action) {
            if ($this->why($order, $user, $shop, $action) === null) {
                $actions[] = $action;
            }
        }

        return $actions;
    }

    public function assert(Order $order, User $user, Shop $shop, string $action): void
    {
        $reason = $this->why($order, $user, $shop, $action);
        if ($reason !== null) {
            [$code, $message, $status] = $reason;
            throw new BusinessRuleException($code, $message, $status);
        }
    }

    /**
     * Null when allowed, otherwise [code, message, http status].
     *
     * @return array{0: string, 1: string, 2: int}|null
     */
    private function why(Order $order, User $user, Shop $shop, string $action): ?array
    {
        $isAdmin = $user->isGlomaAdmin();

        if (in_array($action, [self::PRINT_INVOICE, self::ADD_NOTE], true)) {
            return null;
        }
        if ($action === self::PRINT_LABEL) {
            return $order->isWalkIn() || $order->status === OrderStatus::Cancelled
                ? ['invalid_transition', 'This order has no delivery label.', 409]
                : null;
        }

        if ($shop->isClosed() && ! $isAdmin) {
            return ['shop_closed', 'This shop is closed. It is read-only.', 409];
        }

        // Owners run the lifecycle only for the shop's own orders; Gloma ships Gloma's orders (D17, D33).
        if (! $isAdmin && $order->seller !== Party::Shop) {
            return ['not_your_order', 'Gloma handles this order.', 403];
        }

        $permission = in_array($action, [self::RECORD_PAYMENT, self::REFUND], true) ? Perm::PAYMENTS_RECORD : Perm::ORDERS_MANAGE;
        if (! $user->can($permission)) {
            return ['forbidden', 'You are not allowed to do this.', 403];
        }

        $s = $order->status;
        $walkIn = $order->isWalkIn();
        $bad = fn (string $msg): array => ['invalid_transition', $msg, 409];

        return match ($action) {
            self::EDIT => $s->isEditable() ? null : $bad('Orders can only be changed until they are packed.'),
            self::CONFIRM => $s === OrderStatus::AwaitingConfirmation ? null : $bad('Only orders awaiting confirmation can be confirmed.'),
            self::PACK => $s === OrderStatus::Processing ? null : $bad('Confirm the order before packing.'),
            self::DISPATCH => $s === OrderStatus::Packed ? null : $bad('Pack the order before dispatching.'),
            self::DELIVER => $s === OrderStatus::Dispatched ? null : $bad('Only dispatched orders can be marked delivered.'),
            self::RETURN => ! $walkIn && in_array($s, [OrderStatus::Dispatched, OrderStatus::Delivered], true)
                ? null : $bad('Only dispatched or delivered orders can be returned.'),
            self::CANCEL => $s->isCancellable() ? null : $bad('Orders can only be cancelled before dispatch.'),
            self::RECORD_PAYMENT => $order->payment_status === PaymentStatus::Unpaid
                && ! in_array($s, [OrderStatus::Cancelled, OrderStatus::Returned], true)
                ? null : $bad('This order cannot take a payment now.'),
            self::REFUND => $order->payment_status === PaymentStatus::Paid
                && in_array($s, [OrderStatus::Cancelled, OrderStatus::Returned], true)
                ? null : $bad('Only paid orders that were cancelled or returned can be refunded.'),
            default => ['unknown_action', 'Unknown action.', 422],
        };
    }
}
