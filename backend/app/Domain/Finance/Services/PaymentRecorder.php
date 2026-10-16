<?php

declare(strict_types=1);

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Models\Payment;
use App\Domain\Orders\Enums\PaymentStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderRecorder;

/**
 * Records a full payment or refund for an order and the matching ledger entry on the seller's side (D37).
 */
final class PaymentRecorder
{
    public function __construct(
        private readonly MoneyLedger $ledger,
        private readonly OrderRecorder $recorder,
    ) {}

    public function pay(Order $order, ?int $paymentMethodId, ?string $reference, ?string $slipPath): Payment
    {
        $payment = Payment::create([
            'shop_id' => $order->shop_id,
            'order_id' => $order->id,
            'kind' => 'payment',
            'amount' => $order->total,
            'payment_method_id' => $paymentMethodId ?? $order->payment_method_id,
            'reference' => $reference,
            'slip_path' => $slipPath,
            'recorded_by' => auth()->id(),
            'paid_at' => now(),
        ]);

        $this->ledger->record($order->shop_id, LedgerType::OrderPayment, $order->total, $order->seller,
            "Payment for {$order->number}", ['order_id' => $order->id]);

        $order->payment_status = PaymentStatus::Paid;
        $order->paid_at = now();
        $order->version++;
        $order->save();

        $this->recorder->record($order, 'payment_recorded', meta: ['amount' => $order->total, 'reference' => $reference]);

        return $payment;
    }

    public function refund(Order $order, ?string $reference): Payment
    {
        $payment = Payment::create([
            'shop_id' => $order->shop_id,
            'order_id' => $order->id,
            'kind' => 'refund',
            'amount' => $order->total,
            'payment_method_id' => $order->payment_method_id,
            'reference' => $reference,
            'recorded_by' => auth()->id(),
            'paid_at' => now(),
        ]);

        $this->ledger->record($order->shop_id, LedgerType::Refund, $order->total, $order->seller,
            "Refund for {$order->number}", ['order_id' => $order->id]);

        $order->payment_status = PaymentStatus::Refunded;
        $order->version++;
        $order->save();

        $this->recorder->record($order, 'refunded', meta: ['amount' => $order->total, 'reference' => $reference]);

        return $payment;
    }
}
