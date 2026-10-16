<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Audit\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AuditLog */
class AuditLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'user' => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null,
            'shop' => $this->shop ? ['id' => $this->shop->id, 'name' => $this->shop->name] : null,
            'subject' => $this->subject_type ? ['type' => $this->subject_type, 'id' => $this->subject_id] : null,
            'changes' => $this->changes,
            'ip' => $this->ip,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
