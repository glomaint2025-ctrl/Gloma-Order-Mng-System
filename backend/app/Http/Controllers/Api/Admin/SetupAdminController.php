<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Couriers\Models\Courier;
use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Models\MessageTemplate;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\CourierAccountResource;
use App\Http\Resources\CourierResource;
use App\Http\Resources\MessageTemplateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

/**
 * Global setup owned by Gloma: couriers, Gloma's courier accounts, default message templates, audit log.
 */
final class SetupAdminController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function couriers(): AnonymousResourceCollection
    {
        return CourierResource::collection(Courier::query()->orderBy('name')->get());
    }

    /** Fix a courier's tracking link pattern without a deploy (SPIKE-2). Must contain {tracking}. */
    public function updateCourier(Request $request, Courier $courier): CourierResource
    {
        $courier->fill($request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'tracking_url_template' => ['sometimes', 'url', 'max:255', 'regex:/\{tracking\}/'],
            'is_active' => ['sometimes', 'boolean'],
        ]))->save();
        Cache::forget('api.meta.v1');
        $this->audit->logModelChange('courier.updated', $courier);

        return new CourierResource($courier);
    }

    public function glomaAccounts(): AnonymousResourceCollection
    {
        return CourierAccountResource::collection(CourierAccount::with('courier')->whereNull('shop_id')->orderBy('label')->get());
    }

    public function storeGlomaAccount(Request $request): JsonResponse
    {
        $data = $this->validateAccount($request, true);
        $account = CourierAccount::create($data + ['shop_id' => null]);
        $this->audit->log('courier_account.created', $account, $data);

        return (new CourierAccountResource($account->load('courier')))->response()->setStatusCode(201);
    }

    public function updateGlomaAccount(Request $request, int $account): CourierAccountResource
    {
        $model = CourierAccount::query()->whereNull('shop_id')->findOrFail($account);
        $model->fill($this->validateAccount($request, false))->save();
        $this->audit->log('courier_account.updated', $model, $model->getChanges());

        return new CourierAccountResource($model->load('courier'));
    }

    public function templates(): AnonymousResourceCollection
    {
        return MessageTemplateResource::collection(MessageTemplate::query()->whereNull('shop_id')->orderBy('event')->orderBy('channel')->get());
    }

    public function saveTemplate(Request $request): MessageTemplateResource
    {
        $data = $request->validate([
            'event' => ['required', Rule::enum(MessageEvent::class)],
            'channel' => ['required', Rule::enum(MessageChannel::class)],
            'subject' => ['nullable', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $template = MessageTemplate::query()->updateOrCreate(
            ['shop_id' => null, 'event' => $data['event'], 'channel' => $data['channel']],
            ['subject' => $data['subject'] ?? null, 'body' => $data['body'], 'is_active' => $data['is_active'] ?? true],
        );
        $this->audit->log('template.saved', $template, $data);

        return new MessageTemplateResource($template);
    }

    /** Filters: shop_id, user_id, action (prefix, e.g. "order."), from, to. */
    public function auditLogs(Request $request): AnonymousResourceCollection
    {
        $f = $request->validate([
            'shop_id' => ['nullable', 'integer'],
            'user_id' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'max:60'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        return AuditLogResource::collection(AuditLog::query()->with('user:id,name', 'shop:id,name')
            ->when($f['shop_id'] ?? null, fn ($q, $v) => $q->where('shop_id', $v))
            ->when($f['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($f['action'] ?? null, fn ($q, $v) => $q->where('action', 'like', $v.'%'))
            ->when($f['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($f['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', $v.' 23:59:59'))
            ->latest('id')->paginate(50));
    }

    /** @return array<string, mixed> */
    private function validateAccount(Request $request, bool $creating): array
    {
        return $request->validate([
            'courier_id' => [$creating ? 'required' : 'sometimes', 'integer', 'exists:couriers,id'],
            'label' => [$creating ? 'required' : 'sometimes', 'string', 'max:80'],
            'account_ref' => ['nullable', 'string', 'max:80'],
            'default_charge' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
