<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Orders\Models\Order;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compact row for the orders table.
 *
 * @mixin Order
 */
class OrderListResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'channel' => $this->channel->toArray(),
            'seller' => $this->seller->toArray(),
            'status' => $this->status->toArray() + ['tone' => $this->status->tone()],
            'payment_status' => $this->payment_status->toArray() + ['tone' => $this->payment_status->tone()],
            'customer_name' => $this->customer_name,
            'customer_phone_local' => $this->customer_phone ? Phone::local($this->customer_phone) : null,
            'delivery_city' => $this->delivery_city,
            'items_count' => $this->whenCounted('items'),
            'total' => $this->total,
            'tracking_number' => $this->tracking_number,
            'has_warning' => $this->relationLoaded('customer') && $this->customer
                ? ($this->customer->is_risky || $this->customer->returns_count > ($this->status->value === 'returned' ? 1 : 0))
                : false,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
