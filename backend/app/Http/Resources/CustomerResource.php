<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Customers\Models\Customer;
use App\Domain\Customers\Services\CustomerService;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Customer */
class CustomerResource extends JsonResource
{
    private bool $detailed = false;

    /** Single-customer view: adds the computed warnings. Lists use the cheap counters only. */
    public static function detailed(Customer $customer): self
    {
        $resource = new self($customer);
        $resource->detailed = true;

        return $resource;
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'phone_local' => Phone::local($this->phone),
            'email' => $this->email,
            'address' => $this->address,
            'city' => $this->city,
            'is_risky' => $this->is_risky,
            'risk_note' => $this->risk_note,
            'orders_count' => $this->orders_count,
            'returns_count' => $this->returns_count,
            'has_warning' => $this->is_risky || $this->returns_count > 0,
            'warnings' => $this->when($this->detailed, fn () => app(CustomerService::class)->warnings($this->resource, $request->user())),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
