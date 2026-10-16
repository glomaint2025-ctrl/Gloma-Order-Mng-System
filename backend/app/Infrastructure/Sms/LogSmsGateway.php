<?php

declare(strict_types=1);

namespace App\Infrastructure\Sms;

use App\Domain\Notifications\Contracts\SmsGateway;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/** Development / test driver: writes the SMS to the log instead of sending it. */
final class LogSmsGateway implements SmsGateway
{
    public function send(string $to, string $message): string
    {
        Log::info('SMS (log driver)', ['to' => $to, 'message' => $message]);

        return 'log-'.Str::random(10);
    }
}
