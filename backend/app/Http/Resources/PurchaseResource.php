<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Inventory\Models\StockPurchase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StockPurchase */
class PurchaseResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'supplier' => $this->supplier,
            'purchased_on' => $this->purchased_on->toDateString(),
            'total' => $this->total,
            'notes' => $this->notes,
            'lines_count' => $this->whenCounted('lines'),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($l) => [
                'id' => $l->id,
                'product' => ['id' => $l->product->id, 'sku' => $l->product->sku, 'name' => $l->product->name],
                'location' => $l->location->toArray(),
                'qty' => $l->qty,
                'unit_cost' => $l->unit_cost,
                'line_total' => $l->line_total,
            ])),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
