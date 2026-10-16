<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Couriers\Models\Courier;
use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Models\MessageTemplate;
use App\Domain\Orders\Enums\OrderChannel;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\PaymentMethodKind;
use App\Domain\Orders\Enums\PaymentStatus;
use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Enums\StockMode;
use App\Http\Controllers\Controller;
use App\Http\Resources\CourierResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

final class MetaController extends Controller
{
    /** Every enum as {value, label} so the UI never hard-codes labels. Cached 1 hour. */
    public function meta(): JsonResponse
    {
        $data = Cache::remember('api.meta.v1', 3600, fn () => [
            'order_statuses' => array_map(fn (OrderStatus $s) => $s->toArray() + ['tone' => $s->tone()], OrderStatus::cases()),
            'payment_statuses' => array_map(fn (PaymentStatus $s) => $s->toArray() + ['tone' => $s->tone()], PaymentStatus::cases()),
            'order_channels' => OrderChannel::options(),
            'parties' => Party::options(),
            'stock_locations' => StockLocation::options(),
            'stock_modes' => StockMode::options(),
            'shop_statuses' => ShopStatus::options(),
            'movement_types' => MovementType::options(),
            'manual_adjustment_types' => array_map(fn ($t) => $t->toArray(), MovementType::manualAdjustments()),
            'ledger_types' => LedgerType::options(),
            'manual_ledger_types' => array_map(fn ($t) => $t->toArray() + ['sign' => $t->sign()], LedgerType::manual()),
            'payment_method_kinds' => PaymentMethodKind::options(),
            'message_events' => MessageEvent::options(),
            'message_channels' => MessageChannel::options(),
            'template_placeholders' => MessageTemplate::PLACEHOLDERS,
            'couriers' => CourierResource::collection(Courier::query()->where('is_active', true)->orderBy('name')->get())->resolve(),
            'currency' => 'LKR',
            'timezone' => config('app.timezone'),
            'privacy_notice_url' => config('portal.privacy_notice_url'),
        ]);

        return response()->json(['data' => $data]);
    }

    /** Health check for deploys and uptime monitors. */
    public function health(): JsonResponse
    {
        $db = true;
        try {
            DB::select('select 1');
        } catch (Throwable) {
            $db = false;
        }

        $lastCron = Cache::get('portal.cron_heartbeat');

        return response()->json([
            'status' => $db ? 'ok' : 'degraded',
            'database' => $db,
            'queue' => [
                'pending' => $db ? DB::table('jobs')->count() : null,
                'failed' => $db ? DB::table('failed_jobs')->count() : null,
            ],
            'cron_last_run' => $lastCron,
            'version' => config('app.version'),
            'time' => now()->toIso8601String(),
        ], $db ? 200 : 503);
    }
}
