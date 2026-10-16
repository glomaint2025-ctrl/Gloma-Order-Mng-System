<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $isAdmin = $this->isGlomaAdmin();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'role' => ['value' => $isAdmin ? 'gloma_admin' : 'shop_owner', 'label' => $isAdmin ? 'Gloma admin' : 'Shop owner'],
            'shops' => $this->whenLoaded('shops', fn () => $this->shops->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'code' => $s->code])),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
        ];
    }
}
