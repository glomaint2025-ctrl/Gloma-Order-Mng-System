<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Shop;

use App\Domain\Orders\Actions\CancelOrder;
use App\Domain\Orders\Actions\ChangeOrderStatus;
use App\Domain\Orders\Actions\DispatchOrder;
use App\Domain\Orders\Actions\OrderPayments;
use App\Domain\Orders\Actions\PlaceOrder;
use App\Domain\Orders\Actions\ReturnOrder;
use App\Domain\Orders\Actions\UpdateOrder;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderRecorder;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderListResource;
use App\Http\Resources\OrderNoteResource;
use App\Http\Resources\OrderResource;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class OrderController extends Controller
{
    /** Filters: status, payment_status, seller, channel, search (number / name / phone), from, to, needs_action. */
    public function index(Request $request, Shop $shop): AnonymousResourceCollection
    {
        $f = $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'payment_status' => ['nullable', 'in:unpaid,paid,refunded'],
            'seller' => ['nullable', 'in:gloma,shop'],
            'channel' => ['nullable', 'in:delivery,walk_in'],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'needs_action' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $orders = Order::query()
            ->with('customer:id,is_risky,returns_count')
            ->withCount('items')
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['payment_status'] ?? null, fn ($q, $v) => $q->where('payment_status', $v))
            ->when($f['seller'] ?? null, fn ($q, $v) => $q->where('seller', $v))
            ->when($f['channel'] ?? null, fn ($q, $v) => $q->where('channel', $v))
            ->when($f['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', Carbon::parse($v)->startOfDay()))
            ->when($f['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', Carbon::parse($v)->endOfDay()))
            ->when($request->boolean('needs_action'), fn ($q) => $q->whereIn('status', [
                OrderStatus::AwaitingConfirmation->value, OrderStatus::Processing->value, OrderStatus::Packed->value,
            ]))
            ->when($f['search'] ?? null, function ($q, $term) {
                $phone = Phone::normalize($term);
                $q->where(fn ($w) => $w->where('number', 'like', "%{$term}%")
                    ->orWhere('customer_name', 'like', "%{$term}%")
                    ->orWhere('tracking_number', 'like', "%{$term}%")
                    ->when($phone, fn ($p) => $p->orWhere('customer_phone', $phone)));
            })
            ->latest('id')
            ->paginate($f['per_page'] ?? 25);

        return OrderListResource::collection($orders);
    }

    public function store(Request $request, Shop $shop, PlaceOrder $action): JsonResponse
    {
        $order = $action->handle($shop, $this->user($request), $this->validateOrder($request, true));

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    public function show(Shop $shop, Order $order): OrderResource
    {
        return new OrderResource($order);
    }

    public function update(Request $request, Shop $shop, Order $order, UpdateOrder $action): OrderResource
    {
        $data = $this->validateOrder($request, false) + $request->validate(['version' => ['required', 'integer']]);

        return new OrderResource($action->handle($shop, $this->user($request), $order, $data));
    }

    public function confirm(Request $request, Shop $shop, Order $order, ChangeOrderStatus $action): OrderResource
    {
        return new OrderResource($action->confirm($shop, $this->user($request), $order));
    }

    public function pack(Request $request, Shop $shop, Order $order, ChangeOrderStatus $action): OrderResource
    {
        return new OrderResource($action->pack($shop, $this->user($request), $order));
    }

    public function dispatch(Request $request, Shop $shop, Order $order, DispatchOrder $action): OrderResource
    {
        $data = $request->validate([
            'courier_account_id' => ['required', 'integer'],
            'tracking_number' => ['required', 'string', 'max:100'],
            'courier_charge' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
        ]);

        return new OrderResource($action->handle($shop, $this->user($request), $order, (int) $data['courier_account_id'],
            $data['tracking_number'], isset($data['courier_charge']) ? (string) $data['courier_charge'] : null));
    }

    public function deliver(Request $request, Shop $shop, Order $order, ChangeOrderStatus $action): OrderResource
    {
        $data = $request->validate([
            'record_payment' => ['sometimes', 'boolean'],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        return new OrderResource($action->deliver($shop, $this->user($request), $order, (bool) ($data['record_payment'] ?? false), $data['reference'] ?? null));
    }

    public function cancel(Request $request, Shop $shop, Order $order, CancelOrder $action): OrderResource
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        return new OrderResource($action->handle($shop, $this->user($request), $order, $data['reason']));
    }

    public function return(Request $request, Shop $shop, Order $order, ReturnOrder $action): OrderResource
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'return_charge' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'items' => ['sometimes', 'array'],
            'items.*.order_item_id' => ['required', 'integer'],
            'items.*.damaged_qty' => ['required', 'integer', 'min:0'],
        ]);

        $damaged = [];
        foreach ((array) ($data['items'] ?? []) as $i) {
            $damaged[(int) $i['order_item_id']] = (int) $i['damaged_qty'];
        }

        return new OrderResource($action->handle($shop, $this->user($request), $order, $data['reason'], $damaged,
            isset($data['return_charge']) ? (string) $data['return_charge'] : null));
    }

    public function pay(Request $request, Shop $shop, Order $order, OrderPayments $action): OrderResource
    {
        $data = $request->validate([
            'payment_method_id' => ['nullable', 'integer'],
            'reference' => ['nullable', 'string', 'max:120'],
            'slip' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,webp', 'max:5120'],
        ]);

        return new OrderResource($action->record($shop, $this->user($request), $order,
            isset($data['payment_method_id']) ? (int) $data['payment_method_id'] : null, $data['reference'] ?? null, $request->file('slip')));
    }

    public function refund(Request $request, Shop $shop, Order $order, OrderPayments $action): OrderResource
    {
        $data = $request->validate(['reference' => ['nullable', 'string', 'max:120']]);

        return new OrderResource($action->refund($shop, $this->user($request), $order, $data['reference'] ?? null));
    }

    public function slip(Shop $shop, Order $order, int $payment): StreamedResponse
    {
        $record = $order->payments()->whereKey($payment)->whereNotNull('slip_path')->firstOrFail();

        return Storage::disk('local')->response((string) $record->slip_path);
    }

    public function addNote(Request $request, Shop $shop, Order $order, OrderRecorder $recorder): JsonResponse
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $note = $order->notes()->create(['user_id' => $request->user()?->getAuthIdentifier(), 'body' => $data['body']]);
        $recorder->record($order, 'note_added');

        return (new OrderNoteResource($note->load('user')))->response()->setStatusCode(201);
    }

    /** @return array<string, mixed> */
    private function validateOrder(Request $request, bool $creating): array
    {
        $channel = $request->input('channel', 'delivery');
        $delivery = $channel === 'delivery' || ! $creating;

        return $request->validate([
            'channel' => ['sometimes', 'in:delivery,walk_in'], // ignored on edit: the channel never changes
            'payment_method_id' => ['required', 'integer'],
            'customer' => [$delivery && $channel !== 'walk_in' ? 'required' : 'nullable', 'array'],
            'customer.phone' => [$delivery && $channel !== 'walk_in' ? 'required' : 'nullable', 'string', 'max:20'],
            'customer.name' => [$delivery && $channel !== 'walk_in' ? 'required' : 'nullable', 'string', 'max:120'],
            'customer.email' => ['nullable', 'email', 'max:150'],
            'customer.address' => ['nullable', 'string', 'max:255'],
            'customer.city' => ['nullable', 'string', 'max:80'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:10000'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'discount' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
