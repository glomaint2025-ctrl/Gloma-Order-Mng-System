<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Couriers\Models\Courier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Courier */
class CourierResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            "id" => $this->id,
            "code" => $this->code,
            "name" => $this->name,
            "tracking_url_template" => $this->tracking_url_template,
            "is_active" => $this->is_active,
        ];
    }
}
