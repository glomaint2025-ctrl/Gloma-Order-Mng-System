<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Shop;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Finance\Queries\SalesReport;
use App\Domain\Finance\Queries\ShopFigures;
use App\Domain\Finance\Services\MoneyLedger;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Http\Resources\LedgerEntryResource;
use App\Http\Resources\MessageLogResource;
use App\Support\BusinessRuleException;
use App\Support\CsvExport;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Dashboard, reports, money ledger and SMS usage for one shop.
 */
final class FinanceController extends Controller
{
    /** One call for the whole dashboard. Period defaults to this month. */
    public function dashboard(Request $request, Shop $shop, ShopFigures $figures): JsonResponse
    {
        [$from, $to] = $this->period($request);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'stock' => $figures->stock($shop->id),
            'investment' => $figures->investment($shop->id),
            'sales' => $figures->salesBySeller($shop->id, $from, $to),
            'open_orders' => $figures->openOrders($shop->id),
            'cod_outstanding' => $figures->codOutstanding($shop->id),
            'balances' => $figures->balances($shop->id),
            'returns' => $figures->returnsCount($shop->id, $from, $to),
            'trend' => $figures->trend($shop->id, $from, $to),
        ]]);
    }

    public function salesReport(Request $request, Shop $shop, SalesReport $report): JsonResponse
    {
        [$from, $to] = $this->period($request);

        return response()->json(['data' => $report->build($shop->id, $from, $to)]);
    }

    /** Ledger statement with totals per side and per type. Filters: party, type, from, to. */
    public function ledger(Request $request, Shop $shop): JsonResponse
    {
        $f = $request->validate(['per_page' => ['nullable', 'integer', 'min:5', 'max:200']]);
        $query = $this->ledgerQuery($request);

        $byType = (clone $query)->groupBy('party', 'type')->select('party', 'type', DB::raw('sum(amount) as total'))->get()
            ->map(fn ($r) => ['party' => $r->party->toArray(), 'type' => $r->type->toArray(), 'total' => Money::of((string) $r->getAttribute('total'))]);

        $page = (clone $query)->with('order:id,number', 'creator:id,name')->latest('occurred_on')->latest('id')->paginate($f['per_page'] ?? 50);

        return LedgerEntryResource::collection($page)->additional(['summary' => [
            'by_type' => $byType->values(),
            'balances' => app(ShopFigures::class)->balances($shop->id),
        ]])->response();
    }

    /** The ledger (same filters) as CSV, oldest first, with a running balance per side. */
    public function exportLedger(Request $request, Shop $shop): StreamedResponse
    {
        // Explicit shop filter: rows stream after the tenant middleware has finished (see CsvExport).
        $entries = $this->ledgerQuery($request)->where('ledger_entries.shop_id', $shop->id)->with('order:id,number')->orderBy('occurred_on')->orderBy('id')->lazy(500);

        $rows = (function () use ($entries) {
            $running = ['gloma' => '0.00', 'shop' => '0.00'];
            foreach ($entries as $e) {
                $running[$e->party->value] = Money::add($running[$e->party->value], $e->amount);
                yield [
                    $e->occurred_on->toDateString(), $e->party->label(), $e->type->label(), $e->description,
                    $e->order?->number, $e->amount, $running[$e->party->value],
                ];
            }
        })();

        return CsvExport::download("ledger-{$shop->code}-".now()->format('Ymd-His').'.csv',
            ['Date', 'Side', 'Type', 'Description', 'Order', 'Amount', 'Running balance (side)'], $rows);
    }

    /** Sales report products table as CSV (same period rules as the report). */
    public function exportSalesReport(Request $request, Shop $shop, SalesReport $report): StreamedResponse
    {
        [$from, $to] = $this->period($request);
        $data = $report->build($shop->id, $from, $to);

        $rows = array_map(fn (array $p) => [
            $p['sku'], $p['name'], $p['bought_qty'], $p['bought_cost'],
            $p['sold']['gloma']['qty'], $p['sold']['gloma']['revenue'], $p['sold']['shop']['qty'], $p['sold']['shop']['revenue'],
            $p['revenue'], $p['cogs'], $p['gross_profit'], $p['returned_qty'], $p['damaged_qty'], $p['in_stock'],
        ], $data['products']);
        $t = $data['totals'];
        $rows[] = ['TOTAL', "Net revenue {$t['net_revenue']} · delivery fees {$t['delivery_fees_collected']} · courier {$t['courier_charges']} · returns {$t['return_charges']}",
            null, null, null, null, null, null, $t['items_revenue'], $t['cost_of_goods_sold'], $t['gross_profit'], null, null, null];

        return CsvExport::download("sales-{$shop->code}-{$from->toDateString()}-to-{$to->toDateString()}.csv", [
            'SKU', 'Product', 'Bought qty', 'Bought cost', 'Sold by Gloma (qty)', 'Gloma revenue', 'Sold by shop (qty)', 'Shop revenue',
            'Revenue', 'Cost of goods sold', 'Gross profit', 'Returned (good)', 'Damaged', 'In stock',
        ], $rows);
    }

    /** @return Builder<LedgerEntry> */
    private function ledgerQuery(Request $request): Builder
    {
        $f = $request->validate([
            'party' => ['nullable', Rule::enum(Party::class)],
            'type' => ['nullable', Rule::enum(LedgerType::class)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        return LedgerEntry::query()
            ->when($f['party'] ?? null, fn ($q, $v) => $q->where('party', $v))
            ->when($f['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($f['from'] ?? null, fn ($q, $v) => $q->whereDate('occurred_on', '>=', $v))
            ->when($f['to'] ?? null, fn ($q, $v) => $q->whereDate('occurred_on', '<=', $v));
    }

    /** Admin-only manual entries: money from shop, Gloma fee, payout, adjustment. */
    public function storeLedger(Request $request, Shop $shop, MoneyLedger $ledger, AuditLogger $audit): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_map(fn ($t) => $t->value, LedgerType::manual()))],
            'amount' => ['required', 'numeric', 'not_in:0', 'between:-99999999,99999999'],
            'party' => ['nullable', Rule::enum(Party::class)],
            'description' => ['required', 'string', 'max:255'],
            'occurred_on' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $type = LedgerType::from($data['type']);
        if ($type !== LedgerType::Adjustment && Money::isNegative((string) $data['amount'])) {
            throw new BusinessRuleException('invalid_amount', 'Enter a positive amount. Only adjustments can be negative.', 422);
        }
        if ($type === LedgerType::Adjustment && empty($data['party'])) {
            throw new BusinessRuleException('party_required', 'Choose whose money this adjustment is for.', 422);
        }

        $entry = $ledger->record($shop->id, $type, (string) $data['amount'], isset($data['party']) ? Party::from($data['party']) : null,
            $data['description'], ['occurred_on' => $data['occurred_on'] ?? null]);
        $audit->log('ledger.manual_entry', $entry, ['type' => $type->value, 'amount' => $entry->amount]);

        return (new LedgerEntryResource($entry->load('creator')))->response()->setStatusCode(201);
    }

    /** SMS / email log for this shop. Filters: month (YYYY-MM), channel, status. Summary = what Gloma bills the shop. */
    public function messages(Request $request, Shop $shop): JsonResponse
    {
        $f = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'channel' => ['nullable', 'in:sms,email'],
            'status' => ['nullable', 'in:queued,sent,failed,skipped'],
        ]);
        $month = Carbon::createFromFormat('Y-m', $f['month'] ?? now()->format('Y-m'))->startOfMonth();

        $query = MessageLog::query()->whereBetween('created_at', [$month, $month->copy()->endOfMonth()])
            ->when($f['channel'] ?? null, fn ($q, $v) => $q->where('channel', $v))
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v));

        $sms = MessageLog::query()->where('channel', 'sms')->where('status', 'sent')
            ->whereBetween('created_at', [$month, $month->copy()->endOfMonth()]);

        return MessageLogResource::collection($query->latest('id')->paginate(50))->additional(['summary' => [
            'month' => $month->format('Y-m'),
            'sms_sent' => (clone $sms)->count(),
            'sms_segments' => (int) (clone $sms)->sum('segments'),
            'sms_cost' => Money::of((string) (clone $sms)->sum('cost')),
            'failed' => MessageLog::query()->where('status', 'failed')->whereBetween('created_at', [$month, $month->copy()->endOfMonth()])->count(),
        ]])->response();
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function period(Request $request): array
    {
        $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']]);
        $from = $request->filled('from') ? Carbon::parse((string) $request->input('from'))->startOfDay() : now()->startOfMonth();
        $to = $request->filled('to') ? Carbon::parse((string) $request->input('to'))->endOfDay() : now()->endOfDay();

        return [$from, $to];
    }
}
