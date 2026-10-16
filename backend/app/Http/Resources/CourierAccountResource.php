<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Couriers\Models\CourierAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourierAccount */
class CourierAccountResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            "id" => $this->id,
            "owner" => $this->owner()->toArray(),
            "courier" => ["id" => $this->courier->id, "code" => $this->courier->code, "name" => $this->courier->name],
            "label" => $this->label,
            "account_ref" => $this->account_ref,
            "default_charge" => $this->default_charge,
            "is_active" => $this->is_active,
        ];
    }
}
