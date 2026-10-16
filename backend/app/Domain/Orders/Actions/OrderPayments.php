<?php

declare(strict_types=1);

namespace App\Domain\Orders\Actions;

use App\Domain\Finance\Services\PaymentRecorder;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\PaymentMethod;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/** Record a full payment (COD remitted or prepaid with slip) or refund it (D17, D38). */
final class OrderPayments
{
    public function __construct(
        private readonly OrderRecorder $recorder,
        private readonly OrderRules $rules,
        private readonly PaymentRecorder $payments,
    ) {}

    public function record(Shop $shop, User $actor, Order $order, ?int $paymentMethodId, ?string $reference, ?UploadedFile $slip): Order
    {
        $slipPath = null;

        try {
            return DB::transaction(function () use ($shop, $actor, $order, $paymentMethodId, $reference, $slip, &$slipPath) {
                $order = $this->recorder->lock($order);
                $this->rules->assert($order, $actor, $shop, OrderRules::RECORD_PAYMENT);

                /** @var PaymentMethod|null $method */
                $method = PaymentMethod::query()->whereKey($paymentMethodId ?? $order->payment_method_id)->first();
                if ($method === null) {
                    throw new BusinessRuleException('invalid_payment_method', 'Choose a payment method of this shop.', 422);
                }
                if ($method->requires_slip && $slip === null) {
                    throw new BusinessRuleException('slip_required', "Upload the payment slip for \"{$method->name}\".", 422);
                }

                if ($slip !== null) {
                    $slipPath = $slip->store("slips/{$shop->id}", 'local');
                }

                $this->payments->pay($order, $method->id, $reference, $slipPath ?: null);

                return $order->refresh();
            });
        } catch (\Throwable $e) {
            if ($slipPath) {
                Storage::disk('local')->delete($slipPath);
            }
            throw $e;
        }
    }

    public function refund(Shop $shop, User $actor, Order $order, ?string $reference): Order
    {
        return DB::transaction(function () use ($shop, $actor, $order, $reference) {
            $order = $this->recorder->lock($order);
            $this->rules->assert($order, $actor, $shop, OrderRules::REFUND);
            $this->payments->refund($order, $reference);

            return $order->refresh();
        });
    }
}
