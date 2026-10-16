<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Domain\Finance\Queries\ShopFigures;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class ReportAdminController extends Controller
{
    /** All shops at a glance (period defaults to this month). */
    public function dashboard(Request $request, ShopFigures $figures): JsonResponse
    {
        $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date']]);
        $from = $request->filled('from') ? Carbon::parse((string) $request->input('from'))->startOfDay() : now()->startOfMonth();
        $to = $request->filled('to') ? Carbon::parse((string) $request->input('to'))->endOfDay() : now()->endOfDay();

        $totals = ['stock_value' => '0.00', 'revenue_gloma' => '0.00', 'revenue_shop' => '0.00', 'cod_outstanding' => '0.00', 'open_orders' => 0];
        $rows = Shop::query()->orderBy('name')->get()->map(function (Shop $shop) use ($figures, $from, $to, &$totals) {
            $stock = $figures->stock($shop->id);
            $sales = $figures->salesBySeller($shop->id, $from, $to);
            $cod = $figures->codOutstanding($shop->id);
            $open = array_sum($figures->openOrders($shop->id));
            $codTotal = Money::add($cod[Party::Gloma->value]['amount'], $cod[Party::Shop->value]['amount']);

            $totals['stock_value'] = Money::add($totals['stock_value'], $stock['value']);
            $totals['revenue_gloma'] = Money::add($totals['revenue_gloma'], $sales['gloma']['revenue']);
            $totals['revenue_shop'] = Money::add($totals['revenue_shop'], $sales['shop']['revenue']);
            $totals['cod_outstanding'] = Money::add($totals['cod_outstanding'], $codTotal);
            $totals['open_orders'] += $open;

            return [
                'shop' => ['id' => $shop->id, 'name' => $shop->name, 'code' => $shop->code, 'status' => $shop->status->toArray()],
                'stock_units' => $stock['units'],
                'stock_value' => $stock['value'],
                'low_stock' => $stock['low_stock'],
                'sales' => $sales,
                'open_orders' => $open,
                'cod_outstanding' => $codTotal,
            ];
        });

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'totals' => $totals,
            'shops' => $rows,
        ]]);
    }

    /** SMS usage per shop for a month, for billing shops (D45). */
    public function smsUsage(Request $request): JsonResponse
    {
        $request->validate(['month' => ['nullable', 'date_format:Y-m']]);
        $month = Carbon::createFromFormat('Y-m', (string) $request->input('month', now()->format('Y-m')))->startOfMonth();

        $rows = MessageLog::withoutGlobalScopes()
            ->join('shops', 'shops.id', '=', 'message_logs.shop_id')
            ->where('message_logs.channel', 'sms')
            ->whereBetween('message_logs.created_at', [$month, $month->copy()->endOfMonth()])
            ->groupBy('shops.id', 'shops.name', 'shops.code')
            ->select('shops.id', 'shops.name', 'shops.code',
                DB::raw("sum(case when message_logs.status = 'sent' then 1 else 0 end) as sent"),
                DB::raw("sum(case when message_logs.status = 'failed' then 1 else 0 end) as failed"),
                DB::raw("sum(case when message_logs.status = 'sent' then message_logs.segments else 0 end) as segments"),
                DB::raw("sum(case when message_logs.status = 'sent' then message_logs.cost else 0 end) as cost"))
            ->orderBy('shops.name')
            ->get()
            ->map(fn ($r) => [
                'shop' => ['id' => (int) $r->getAttribute('id'), 'name' => $r->getAttribute('name'), 'code' => $r->getAttribute('code')],
                'sent' => (int) $r->getAttribute('sent'),
                'failed' => (int) $r->getAttribute('failed'),
                'segments' => (int) $r->getAttribute('segments'),
                'cost' => Money::of((string) $r->getAttribute('cost')),
            ]);

        return response()->json(['data' => [
            'month' => $month->format('Y-m'),
            'cost_per_segment' => Money::of((string) config('portal.sms.cost_per_segment')),
            'shops' => $rows,
            'total_cost' => Money::add('0', ...$rows->pluck('cost')->all()),
        ]]);
    }
}
