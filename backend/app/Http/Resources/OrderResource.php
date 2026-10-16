<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Customers\Services\CustomerService;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Support\OrderRules;
use App\Domain\Shops\Models\Shop;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Full order. `available_actions` decides which buttons the UI shows (D54).
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['items', 'events.user', 'notes.user', 'payments.method', 'paymentMethod', 'courierAccount.courier', 'customer', 'placedBy']);
        $user = $request->user();
        /** @var Shop $shop */
        $shop = Shop::query()->findOrFail($this->shop_id);

        return [
            'id' => $this->id,
            'number' => $this->number,
            'version' => $this->version,
            'channel' => $this->channel->toArray(),
            'seller' => $this->seller->toArray(),
            'status' => $this->status->toArray() + ['tone' => $this->status->tone()],
            'payment_status' => $this->payment_status->toArray() + ['tone' => $this->payment_status->tone()],
            'available_actions' => app(OrderRules::class)->availableActions($this->resource, $user, $shop),
            'warnings' => app(CustomerService::class)->warnings($this->customer, $user, $this->id),
            'placed_by' => $this->placedBy ? ['id' => $this->placedBy->id, 'name' => $this->placedBy->name] : null,
            'customer' => [
                'id' => $this->customer_id,
                'name' => $this->customer_name,
                'phone' => $this->customer_phone,
                'phone_local' => $this->customer_phone ? Phone::local($this->customer_phone) : null,
                'email' => $this->customer_email,
                'address' => $this->delivery_address,
                'city' => $this->delivery_city,
            ],
            'items' => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'sku' => $i->sku,
                'name' => $i->name,
                'location' => $i->location->toArray(),
                'qty' => $i->qty,
                'unit_price' => $i->unit_price,
                'line_total' => $i->line_total,
                'returned_good_qty' => $i->returned_good_qty,
                'returned_damaged_qty' => $i->returned_damaged_qty,
            ])->values(),
            'payment_method' => $this->paymentMethod ? [
                'id' => $this->paymentMethod->id,
                'name' => $this->paymentMethod->name,
                'kind' => $this->paymentMethod->kind->toArray(),
                'requires_slip' => $this->paymentMethod->requires_slip,
            ] : null,
            'totals' => [
                'subtotal' => $this->subtotal,
                'discount' => $this->discount,
                'delivery_fee' => $this->delivery_fee,
                'total' => $this->total,
            ],
            'shipping' => [
                'courier' => $this->courierAccount ? ['id' => $this->courierAccount->courier->id, 'name' => $this->courierAccount->courier->name] : null,
                'courier_account' => $this->courierAccount ? ['id' => $this->courierAccount->id, 'label' => $this->courierAccount->label] : null,
                'tracking_number' => $this->tracking_number,
                'tracking_url' => $this->tracking_url,
                'courier_charge' => $this->courier_charge,
            ],
            'cancel_reason' => $this->cancel_reason,
            'return_reason' => $this->return_reason,
            'return_charge' => $this->return_charge,
            'payments' => $this->payments->map(fn ($p) => [
                'id' => $p->id,
                'kind' => $p->kind,
                'amount' => $p->amount,
                'method' => $p->method?->name,
                'reference' => $p->reference,
                'has_slip' => $p->slip_path !== null,
                'paid_at' => $p->paid_at->toIso8601String(),
            ])->values(),
            'timeline' => $this->events->map(fn ($e) => [
                'id' => $e->id,
                'type' => $e->type,
                'label' => self::eventLabel($e->type),
                'to_status' => $e->to_status,
                'meta' => $e->meta,
                'user' => $e->user ? ['id' => $e->user->id, 'name' => $e->user->name] : null,
                'created_at' => $e->created_at->toIso8601String(),
            ])->values(),
            'notes' => OrderNoteResource::collection($this->notes),
            'dates' => [
                'created_at' => $this->created_at->toIso8601String(),
                'confirmed_at' => $this->confirmed_at?->toIso8601String(),
                'packed_at' => $this->packed_at?->toIso8601String(),
                'dispatched_at' => $this->dispatched_at?->toIso8601String(),
                'delivered_at' => $this->delivered_at?->toIso8601String(),
                'returned_at' => $this->returned_at?->toIso8601String(),
                'cancelled_at' => $this->cancelled_at?->toIso8601String(),
                'paid_at' => $this->paid_at?->toIso8601String(),
            ],
        ];
    }

    public static function eventLabel(string $type): string
    {
        return match ($type) {
            'placed' => 'Order placed',
            'edited' => 'Order changed',
            'confirmed' => 'Confirmed',
            'packed' => 'Packed',
            'dispatched' => 'Handed to courier',
            'delivered' => 'Delivered',
            'returned' => 'Returned',
            'cancelled' => 'Cancelled',
            'payment_recorded' => 'Payment recorded',
            'refunded' => 'Refunded',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
