<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Sri Lankan phone numbers, stored as E.164 (+94XXXXXXXXX).
 */
final class Phone
{
    /** Returns +94XXXXXXXXX or null when the input is not a valid Sri Lankan number. */
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $input) ?? '';

        if (str_starts_with($digits, '0094')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '94') && strlen($digits) === 11) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = substr($digits, 1);
        }

        if (preg_match('/^[1-9]\d{8}$/', $digits) !== 1) {
            return null;
        }

        return '+94'.$digits;
    }

    public static function isMobile(string $e164): bool
    {
        return preg_match('/^\+947\d{8}$/', $e164) === 1;
    }

    /** 0771234567 style, for display and printed labels. */
    public static function local(string $e164): string
    {
        return '0'.substr($e164, 3);
    }
}
