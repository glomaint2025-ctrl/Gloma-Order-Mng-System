<?php

declare(strict_types=1);

namespace App\Infrastructure\Sms;

use App\Domain\Notifications\Contracts\SmsGateway;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Dialog Axiata eSMS "message via URL" API (https://e-sms.dialog.lk), the same account GlomaLoans uses.
 * GET /create/url-campaign with the account key (`esmsqk`). The reply is `1|<campaign id>` on success, or an error code.
 */
final class DialogEsmsSmsGateway implements SmsGateway
{
    private const ERRORS = [
        '2001' => 'could not create the campaign',
        '2007' => 'invalid API key (DIALOG_ESMS_API_KEY)',
        '2008' => 'insufficient account balance',
        '2012' => 'sender mask not registered (check DIALOG_ESMS_SENDER_ID, it is case-sensitive)',
    ];

    public function __construct(
        private readonly string $endpoint,
        private readonly string $apiKey,
        private readonly string $senderId,
    ) {}

    public function send(string $to, string $message): string
    {
        if ($this->apiKey === '' || $this->senderId === '') {
            throw new RuntimeException('Dialog eSMS is not configured (DIALOG_ESMS_API_KEY / DIALOG_ESMS_SENDER_ID).');
        }

        $response = Http::connectTimeout(5)
            ->timeout(15)
            ->acceptJson()
            ->get(rtrim($this->endpoint, '/').'/create/url-campaign', [
                'esmsqk' => $this->apiKey,
                'list' => ltrim($to, '+'),
                'source_address' => $this->senderId,
                'message' => $message,
            ]);

        $raw = trim($response->body());
        if ($response->failed()) {
            throw new RuntimeException("Dialog eSMS error: HTTP {$response->status()}");
        }

        [$code, $ref] = array_pad(explode('|', $raw, 2), 2, '');
        $code = trim($code);
        if ($code !== '1') {
            throw new RuntimeException('Dialog eSMS error: '.(self::ERRORS[$code] ?? "code {$code}"));
        }

        return trim($ref);
    }
}
