<?php

declare(strict_types=1);

namespace App\Domain\Finance\Queries;

use App\Domain\Catalog\Models\Product;
use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Inventory\Models\StockPurchaseLine;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Shops\Enums\Party;
use App\Support\Money;
use Illuminate\Support\Carbon;

/**
 * "From the stock bought, how much Gloma sold, how much the shop sold, and the profit" (D34).
 * Per product and in total. Gross profit only — the split is done by hand outside the system.
 */
final class SalesReport
{
    public function __construct(private readonly ShopFigures $figures) {}

    /** @return array<string, mixed> */
    public function build(int $shopId, Carbon $from, Carbon $to): array
    {
        $soldIds = $this->figures->soldOrders($shopId, $from, $to)->pluck('seller', 'id');

        $items = OrderItem::query()->whereIn('order_id', $soldIds->keys())->get();
        $returnedItems = OrderItem::query()->whereIn('order_id', Order::withoutGlobalScopes()->where('shop_id', $shopId)
            ->where('status', OrderStatus::Returned->value)->whereBetween('returned_at', [$from, $to])->select('id'))->get();
        $bought = StockPurchaseLine::query()
            ->join('stock_purchases', 'stock_purchases.id', '=', 'stock_purchase_lines.stock_purchase_id')
            ->where('stock_purchases.shop_id', $shopId)
            ->whereBetween('stock_purchases.purchased_on', [$from->toDateString(), $to->toDateString()])
            ->get(['stock_purchase_lines.product_id', 'stock_purchase_lines.qty', 'stock_purchase_lines.line_total']);

        $products = Product::withoutGlobalScopes()->where('shop_id', $shopId)->with('stockLevels')->orderBy('name')->get();

        $rows = [];
        $totals = ['revenue' => '0.00', 'cogs' => '0.00'];
        foreach ($products as $product) {
            $row = [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'bought_qty' => (int) $bought->where('product_id', $product->id)->sum('qty'),
                'bought_cost' => Money::add(...$bought->where('product_id', $product->id)->pluck('line_total')->map(fn ($v) => (string) $v)->all() ?: ['0']),
                'sold' => [],
                'revenue' => '0.00',
                'cogs' => '0.00',
                'gross_profit' => '0.00',
                'returned_qty' => (int) $returnedItems->where('product_id', $product->id)->sum('returned_good_qty'),
                'damaged_qty' => (int) $returnedItems->where('product_id', $product->id)->sum('returned_damaged_qty'),
                'in_stock' => $product->totalStock(),
            ];
            foreach (Party::cases() as $party) {
                $partyItems = $items->where('product_id', $product->id)
                    ->filter(fn (OrderItem $i) => $soldIds[$i->order_id] === $party->value || $soldIds[$i->order_id] === $party);
                $revenue = Money::add('0', ...$partyItems->map(fn (OrderItem $i) => $i->line_total)->all());
                $row['sold'][$party->value] = ['qty' => (int) $partyItems->sum('qty'), 'revenue' => $revenue];
                $row['revenue'] = Money::add($row['revenue'], $revenue);
                $row['cogs'] = Money::add($row['cogs'], ...$partyItems->map(fn (OrderItem $i) => Money::mul($i->unit_cost, $i->qty))->all());
            }
            $row['gross_profit'] = Money::sub($row['revenue'], $row['cogs']);
            $totals['revenue'] = Money::add($totals['revenue'], $row['revenue']);
            $totals['cogs'] = Money::add($totals['cogs'], $row['cogs']);
            $rows[] = $row;
        }

        $sold = $this->figures->soldOrders($shopId, $from, $to);
        $discounts = Money::of((string) (clone $sold)->sum('discount'));
        $deliveryFees = Money::of((string) (clone $sold)->sum('delivery_fee'));
        $charges = fn (LedgerType $t) => Money::abs((string) LedgerEntry::withoutGlobalScopes()->where('shop_id', $shopId)
            ->where('type', $t->value)->whereBetween('occurred_on', [$from->toDateString(), $to->toDateString()])->sum('amount'));
        $courier = $charges(LedgerType::CourierCharge);
        $return = $charges(LedgerType::ReturnCharge);

        $netRevenue = Money::sub($totals['revenue'], $discounts);
        $gross = Money::sub(Money::sub(Money::add(Money::sub($netRevenue, $totals['cogs']), $deliveryFees), $courier), $return);

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'products' => $rows,
            'by_seller' => $this->figures->salesBySeller($shopId, $from, $to),
            'totals' => [
                'items_revenue' => $totals['revenue'],
                'discounts' => $discounts,
                'net_revenue' => $netRevenue,
                'cost_of_goods_sold' => $totals['cogs'],
                'delivery_fees_collected' => $deliveryFees,
                'courier_charges' => $courier,
                'return_charges' => $return,
                'gross_profit' => $gross,
            ],
            'note' => 'Real figures only. Profit sharing is calculated outside the system.',
        ];
    }
}
