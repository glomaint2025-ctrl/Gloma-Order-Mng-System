<?php

declare(strict_types=1);

namespace App\Domain\Orders\Support;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Orders\Enums\OrderChannel;
use App\Domain\Orders\Models\PaymentMethod;
use App\Support\BusinessRuleException;
use App\Support\Money;
use App\Support\Phone;
use Illuminate\Support\Collection;

/**
 * Validated, priced order lines and totals, built from request data. Shared by place and edit.
 */
final class OrderDraft
{
    /**
     * @param  list<array{product: Product, qty: int, unit_price: string, line_total: string}>  $lines
     * @param  array{phone: string, name: string, email: ?string, address: ?string, city: ?string}|null  $customer
     */
    private function __construct(
        public readonly array $lines,
        public readonly ?array $customer,
        public readonly PaymentMethod $paymentMethod,
        public readonly string $subtotal,
        public readonly string $discount,
        public readonly string $deliveryFee,
        public readonly string $total,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated request data
     */
    public static function fromInput(int $shopId, OrderChannel $channel, array $data): self
    {
        /** @var PaymentMethod|null $method */
        $method = PaymentMethod::withoutGlobalScopes()->where('shop_id', $shopId)->whereKey($data['payment_method_id'] ?? 0)->first();
        if ($method === null || ! $method->is_active) {
            throw new BusinessRuleException('invalid_payment_method', 'Choose an active payment method for this shop.', 422);
        }

        /** @var Collection<int, Product> $products */
        $products = Product::withoutGlobalScopes()->where('shop_id', $shopId)
            ->whereIn('id', collect($data['items'])->pluck('product_id'))
            ->get()->keyBy('id');

        $lines = [];
        $subtotal = '0.00';
        foreach ($data['items'] as $item) {
            $product = $products->get((int) $item['product_id']);
            if ($product === null) {
                throw new BusinessRuleException('invalid_product', 'One of the products is not in this shop.', 422);
            }
            $qty = (int) $item['qty'];
            $unitPrice = Money::of(isset($item['unit_price']) ? (string) $item['unit_price'] : $product->price);
            $lineTotal = Money::mul($unitPrice, $qty);
            $lines[] = ['product' => $product, 'qty' => $qty, 'unit_price' => $unitPrice, 'line_total' => $lineTotal];
            $subtotal = Money::add($subtotal, $lineTotal);
        }

        $discount = Money::of(isset($data['discount']) ? (string) $data['discount'] : '0');
        $deliveryFee = $channel === OrderChannel::WalkIn ? '0.00' : Money::of(isset($data['delivery_fee']) ? (string) $data['delivery_fee'] : '0');
        if (Money::cmp($discount, $subtotal) > 0) {
            throw new BusinessRuleException('invalid_discount', 'The discount cannot be more than the items total.', 422);
        }

        $customer = null;
        $c = $data['customer'] ?? null;
        if (is_array($c) && ! empty($c['phone'])) {
            $phone = Phone::normalize((string) $c['phone']);
            if ($phone === null) {
                throw new BusinessRuleException('invalid_phone', 'Enter a valid Sri Lankan phone number.', 422);
            }
            $customer = [
                'phone' => $phone,
                'name' => trim((string) ($c['name'] ?? '')) ?: 'Walk-in customer',
                'email' => $c['email'] ?? null,
                'address' => $c['address'] ?? null,
                'city' => $c['city'] ?? null,
            ];
        }

        if ($channel === OrderChannel::Delivery && ($customer === null || empty($customer['address']))) {
            throw new BusinessRuleException('customer_required', 'Delivery orders need the customer phone, name and address.', 422);
        }

        return new self(
            $lines,
            $customer,
            $method,
            $subtotal,
            $discount,
            $deliveryFee,
            Money::add(Money::sub($subtotal, $discount), $deliveryFee),
        );
    }

    /**
     * Net stock change per product+location: negative = take, positive = give back.
     * Sorted by product id so locks are always taken in the same order (no deadlocks).
     *
     * @param  iterable<array{product: Product, location: StockLocation, qty: int}>  $changes
     * @return list<array{product: Product, location: StockLocation, qty: int}>
     */
    public static function netChanges(iterable $changes): array
    {
        $net = [];
        foreach ($changes as $change) {
            $key = $change['product']->id.'|'.$change['location']->value;
            $net[$key] ??= ['product' => $change['product'], 'location' => $change['location'], 'qty' => 0];
            $net[$key]['qty'] += $change['qty'];
        }
        $net = array_values(array_filter($net, fn ($c) => $c['qty'] !== 0));
        usort($net, fn ($a, $b) => [$a['product']->id, $a['qty']] <=> [$b['product']->id, $b['qty']]);

        return $net;
    }
}
