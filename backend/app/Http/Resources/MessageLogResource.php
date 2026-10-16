<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Notifications\Models\MessageLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MessageLog */
class MessageLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            "id" => $this->id,
            "order_id" => $this->order_id,
            "event" => $this->event->toArray(),
            "channel" => $this->channel->toArray(),
            "recipient" => $this->recipient,
            "body" => $this->body,
            "segments" => $this->segments,
            "cost" => $this->cost,
            "status" => $this->status,
            "error" => $this->error,
            "created_at" => $this->created_at->toIso8601String(),
        ];
    }
}
