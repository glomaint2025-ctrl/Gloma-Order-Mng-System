<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Finance\Models\LedgerEntry;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LedgerEntry */
class LedgerEntryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'party' => $this->party->toArray(),
            'type' => $this->type->toArray(),
            'amount' => $this->amount,
            'direction' => Money::isNegative($this->amount) ? 'out' : 'in',
            'order' => $this->order_id ? ['id' => $this->order_id, 'number' => $this->order?->number] : null,
            'stock_purchase_id' => $this->stock_purchase_id,
            'description' => $this->description,
            'occurred_on' => $this->occurred_on->toDateString(),
            'created_by' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
