<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Shop;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Models\MessageTemplate;
use App\Domain\Orders\Enums\PaymentMethodKind;
use App\Domain\Orders\Models\PaymentMethod;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Http\Resources\CourierAccountResource;
use App\Http\Resources\MessageTemplateResource;
use App\Http\Resources\PaymentMethodResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Shop settings any member can manage (D38, D33, D46): payment methods, the shop's courier accounts, message template overrides.
 */
final class SettingsController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function paymentMethods(Request $request, Shop $shop): AnonymousResourceCollection
    {
        return PaymentMethodResource::collection(PaymentMethod::query()
            ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')->get());
    }

    public function storePaymentMethod(Request $request, Shop $shop): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'kind' => ['required', Rule::enum(PaymentMethodKind::class)],
            'requires_slip' => ['sometimes', 'boolean'],
        ]);
        $method = PaymentMethod::create($data + ['shop_id' => $shop->id]);
        $this->audit->log('payment_method.created', $method, $data);

        return (new PaymentMethodResource($method))->response()->setStatusCode(201);
    }

    public function updatePaymentMethod(Request $request, Shop $shop, PaymentMethod $paymentMethod): PaymentMethodResource
    {
        $paymentMethod->fill($request->validate([
            'name' => ['sometimes', 'string', 'max:60'],
            'kind' => ['sometimes', Rule::enum(PaymentMethodKind::class)],
            'requires_slip' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]))->save();
        $this->audit->logModelChange('payment_method.updated', $paymentMethod);

        return new PaymentMethodResource($paymentMethod);
    }

    /**
     * Courier accounts usable for this shop's orders. `?for=gloma` lists Gloma's accounts instead
     * (the dispatch form asks for the order seller's accounts).
     */
    public function courierAccounts(Request $request, Shop $shop): AnonymousResourceCollection
    {
        $gloma = $request->input('for') === 'gloma';

        return CourierAccountResource::collection(CourierAccount::with('courier')
            ->when($gloma, fn ($q) => $q->whereNull('shop_id'), fn ($q) => $q->where('shop_id', $shop->id))
            ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('label')->get());
    }

    public function storeCourierAccount(Request $request, Shop $shop): JsonResponse
    {
        $data = $this->validateAccount($request, true);
        $account = CourierAccount::create($data + ['shop_id' => $shop->id]);
        $this->audit->log('courier_account.created', $account, $data, $shop->id);

        return (new CourierAccountResource($account->load('courier')))->response()->setStatusCode(201);
    }

    public function updateCourierAccount(Request $request, Shop $shop, int $account): CourierAccountResource
    {
        $model = CourierAccount::query()->where('shop_id', $shop->id)->findOrFail($account);
        $model->fill($this->validateAccount($request, false))->save();
        $this->audit->log('courier_account.updated', $model, $model->getChanges(), $shop->id);

        return new CourierAccountResource($model->load('courier'));
    }

    /** All events × channels with the effective template (shop override or global default). */
    public function templates(Shop $shop): JsonResponse
    {
        $rows = [];
        foreach (MessageEvent::cases() as $event) {
            foreach ($event->channels() as $channel) {
                $shopTpl = MessageTemplate::query()->where('shop_id', $shop->id)->where('event', $event->value)->where('channel', $channel->value)->first();
                $global = MessageTemplate::query()->whereNull('shop_id')->where('event', $event->value)->where('channel', $channel->value)->first();
                $rows[] = [
                    'event' => $event->toArray(),
                    'channel' => $channel->toArray(),
                    'uses' => $shopTpl ? 'shop' : 'global',
                    'shop_template' => $shopTpl ? new MessageTemplateResource($shopTpl) : null,
                    'global_template' => $global ? new MessageTemplateResource($global) : null,
                ];
            }
        }

        return response()->json(['data' => $rows, 'placeholders' => MessageTemplate::PLACEHOLDERS]);
    }

    /** Create or replace the shop's override for one event+channel. */
    public function saveTemplate(Request $request, Shop $shop): MessageTemplateResource
    {
        $data = $request->validate([
            'event' => ['required', Rule::enum(MessageEvent::class)],
            'channel' => ['required', Rule::enum(MessageChannel::class)],
            'subject' => ['nullable', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $template = MessageTemplate::query()->updateOrCreate(
            ['shop_id' => $shop->id, 'event' => $data['event'], 'channel' => $data['channel']],
            ['subject' => $data['subject'] ?? null, 'body' => $data['body'], 'is_active' => $data['is_active'] ?? true],
        );
        $this->audit->log('template.saved', $template, $data, $shop->id);

        return new MessageTemplateResource($template);
    }

    /** Remove the shop override; the global default applies again. */
    public function resetTemplate(Request $request, Shop $shop): JsonResponse
    {
        $data = $request->validate([
            'event' => ['required', Rule::enum(MessageEvent::class)],
            'channel' => ['required', Rule::enum(MessageChannel::class)],
        ]);
        MessageTemplate::query()->where('shop_id', $shop->id)->where('event', $data['event'])->where('channel', $data['channel'])->delete();
        $this->audit->log('template.reset', null, $data, $shop->id);

        return response()->json(['message' => 'Using the default template again.']);
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
