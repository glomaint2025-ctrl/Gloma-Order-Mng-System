<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Notifications\Models\MessageTemplate;
use App\Support\SmsSegments;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MessageTemplate */
class MessageTemplateResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scope' => $this->shop_id === null ? 'global' : 'shop',
            'event' => $this->event->toArray(),
            'channel' => $this->channel->toArray(),
            'subject' => $this->subject,
            'body' => $this->body,
            'is_active' => $this->is_active,
            'sms_segments' => $this->channel->value === 'sms' ? SmsSegments::count($this->body) : null,
        ];
    }
}
