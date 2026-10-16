<?php

declare(strict_types=1);

namespace App\Domain\Finance\Queries;

use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Orders\Enums\OrderChannel;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\PaymentStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Enums\Party;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Read-only figures for dashboards and reports. Only real numbers — never forecasts (CBSL, rule 6).
 * All queries filter by shop_id explicitly so they also work for the admin's cross-shop views.
 */
final class ShopFigures
{
    /** @return array{units: int, value: string, by_location: array<string, int>, low_stock: int} */
    public function stock(int $shopId): array
    {
        $rows = StockLevel::withoutGlobalScopes()
            ->join('products', 'products.id', '=', 'stock_levels.product_id')
            ->where('stock_levels.shop_id', $shopId)
            ->get(['stock_levels.location', 'stock_levels.qty', 'stock_levels.product_id', 'products.avg_cost']);

        $value = '0.00';
        $byLocation = [];
        foreach ($rows as $row) {
            $value = Money::add($value, Money::mul((string) $row->getAttribute('avg_cost'), (int) $row->qty));
            $byLocation[$row->location->value] = ($byLocation[$row->location->value] ?? 0) + (int) $row->qty;
        }

        $low = $rows->groupBy('product_id')
            ->filter(fn ($levels) => $levels->sum('qty') <= (int) config('portal.low_stock_threshold'))
            ->count();

        return ['units' => (int) $rows->sum('qty'), 'value' => $value, 'by_location' => $byLocation, 'low_stock' => $low];
    }

    /**
     * Invested money: what the shop paid Gloma vs what was spent on stock.
     *
     * @return array{received_from_shop: string, spent_on_stock: string, unspent: string, gloma_fees: string, paid_out: string}
     */
    public function investment(int $shopId): array
    {
        $sum = fn (LedgerType $type) => Money::of((string) LedgerEntry::withoutGlobalScopes()
            ->where('shop_id', $shopId)->where('type', $type->value)->sum('amount'));

        $received = $sum(LedgerType::ShopPayment);
        $spent = Money::abs($sum(LedgerType::Purchase));

        return [
            'received_from_shop' => $received,
            'spent_on_stock' => $spent,
            'unspent' => Money::sub($received, $spent),
            'gloma_fees' => $sum(LedgerType::GlomaFee),
            'paid_out' => Money::abs($sum(LedgerType::Payout)),
        ];
    }

    /**
     * Sales in a period per seller (sold = delivered or walk-in completed; date = delivered_at).
     *
     * @return array<string, array{orders: int, units: int, revenue: string}>
     */
    public function salesBySeller(int $shopId, Carbon $from, Carbon $to): array
    {
        $out = [];
        foreach (Party::cases() as $party) {
            $orders = $this->soldOrders($shopId, $from, $to)->where('seller', $party->value);
            $units = (int) DB::table('order_items')->whereIn('order_id', (clone $orders)->select('id'))->sum('qty');
            $revenue = Money::of((string) (clone $orders)->sum(DB::raw('subtotal - discount')));
            $out[$party->value] = ['orders' => (clone $orders)->count(), 'units' => $units, 'revenue' => $revenue];
        }

        return $out;
    }

    /** @return array<string, int> status => count of open orders */
    public function openOrders(int $shopId): array
    {
        $counts = Order::withoutGlobalScopes()->where('shop_id', $shopId)
            ->whereIn('status', [OrderStatus::AwaitingConfirmation->value, OrderStatus::Processing->value, OrderStatus::Packed->value, OrderStatus::Dispatched->value])
            ->groupBy('status')->select('status', DB::raw('count(*) as c'))->pluck('c', 'status');

        return [
            'awaiting_confirmation' => (int) ($counts[OrderStatus::AwaitingConfirmation->value] ?? 0),
            'processing' => (int) ($counts[OrderStatus::Processing->value] ?? 0),
            'packed' => (int) ($counts[OrderStatus::Packed->value] ?? 0),
            'dispatched' => (int) ($counts[OrderStatus::Dispatched->value] ?? 0),
        ];
    }

    /** Delivered but not yet paid (COD still with the courier), per seller. @return array<string, array{orders: int, amount: string}> */
    public function codOutstanding(int $shopId): array
    {
        $out = [];
        foreach (Party::cases() as $party) {
            $q = Order::withoutGlobalScopes()->where('shop_id', $shopId)->where('seller', $party->value)
                ->where('channel', OrderChannel::Delivery->value)
                ->where('status', OrderStatus::Delivered->value)
                ->where('payment_status', PaymentStatus::Unpaid->value);
            $out[$party->value] = ['orders' => (clone $q)->count(), 'amount' => Money::of((string) $q->sum('total'))];
        }

        return $out;
    }

    /** Money currently in each side's hands from this deal (sum of ledger per party). @return array<string, string> */
    public function balances(int $shopId): array
    {
        $sums = LedgerEntry::withoutGlobalScopes()->where('shop_id', $shopId)
            ->groupBy('party')->select('party', DB::raw('sum(amount) as total'))->pluck('total', 'party');

        $out = [];
        foreach (Party::cases() as $party) {
            $out[$party->value] = Money::of((string) ($sums[$party->value] ?? '0'));
        }

        return $out;
    }

    public function returnsCount(int $shopId, Carbon $from, Carbon $to): int
    {
        return Order::withoutGlobalScopes()->where('shop_id', $shopId)
            ->where('status', OrderStatus::Returned->value)
            ->whereBetween('returned_at', [$from, $to])->count();
    }

    /** @return \Illuminate\Database\Eloquent\Builder<Order> */
    public function soldOrders(int $shopId, Carbon $from, Carbon $to): \Illuminate\Database\Eloquent\Builder
    {
        return Order::withoutGlobalScopes()->where('shop_id', $shopId)
            ->whereIn('status', OrderStatus::soldValues())
            ->whereBetween('delivered_at', [$from, $to]);
    }
}
