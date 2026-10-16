<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Orders\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PaymentMethod */
class PaymentMethodResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            "id" => $this->id,
            "name" => $this->name,
            "kind" => $this->kind->toArray(),
            "requires_slip" => $this->requires_slip,
            "is_active" => $this->is_active,
        ];
    }
}
