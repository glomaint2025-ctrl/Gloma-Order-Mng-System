<?php

declare(strict_types=1);

namespace App\Infrastructure\Sms;

use App\Domain\Notifications\Contracts\SmsGateway;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Text.lk HTTP API (ASSUMED v3 shape: POST /api/v3/sms/send, Bearer token). Verify in SPIKE-3.
 */
final class TextLkSmsGateway implements SmsGateway
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $token,
        private readonly string $senderId,
    ) {}

    public function send(string $to, string $message): string
    {
        if ($this->token === '' || $this->senderId === '') {
            throw new RuntimeException('Text.lk is not configured (TEXTLK_API_TOKEN / TEXTLK_SENDER_ID).');
        }

        $response = Http::baseUrl($this->baseUrl)
            ->withToken($this->token)
            ->acceptJson()
            ->timeout(15)
            ->post('/api/v3/sms/send', [
                'recipient' => ltrim($to, '+'),
                'sender_id' => $this->senderId,
                'type' => 'plain',
                'message' => $message,
            ]);

        if ($response->failed() || $response->json('status') !== 'success') {
            throw new RuntimeException('Text.lk error: '.($response->json('message') ?? $response->status()));
        }

        return (string) ($response->json('data.uid') ?? $response->json('data.id') ?? '');
    }
}
