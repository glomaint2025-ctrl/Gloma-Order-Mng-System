<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Contracts;

/**
 * SMS provider boundary. Drivers: `log` (dev/test) and `textlk`.
 */
interface SmsGateway
{
    /**
     * @param  string  $to  E.164 number (+94...)
     * @return string provider message reference
     *
     * @throws \RuntimeException when the provider rejects the message
     */
    public function send(string $to, string $message): string;
}
