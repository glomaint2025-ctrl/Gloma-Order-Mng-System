<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Shops\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Shop */
class ShopResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'status' => $this->status->toArray(),
            'stock_mode' => $this->stock_mode->toArray(),
            'is_read_only' => $this->isClosed(),
            'contract_ref' => $this->contract_ref,
            'contract_started_on' => $this->contract_started_on?->toDateString(),
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'notes' => $this->when($request->user()?->isGlomaAdmin() ?? false, $this->notes),
            'owners' => UserResource::collection($this->whenLoaded('owners')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
