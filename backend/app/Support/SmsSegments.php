<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Counts SMS segments: GSM-7 = 160 chars (153 per part), Unicode (e.g. Sinhala) = 70 (67 per part).
 */
final class SmsSegments
{
    private const GSM7 = "@£\$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

    private const GSM7_EXT = '^{}\[~]|€';

    public static function isUnicode(string $text): bool
    {
        foreach (mb_str_split($text) as $char) {
            if (! str_contains(self::GSM7, $char) && ! str_contains(self::GSM7_EXT, $char)) {
                return true;
            }
        }

        return false;
    }

    public static function count(string $text): int
    {
        if ($text === '') {
            return 0;
        }

        if (self::isUnicode($text)) {
            $length = mb_strlen($text);

            return $length <= 70 ? 1 : (int) ceil($length / 67);
        }

        $length = 0;
        foreach (mb_str_split($text) as $char) {
            $length += str_contains(self::GSM7_EXT, $char) ? 2 : 1;
        }

        return $length <= 160 ? 1 : (int) ceil($length / 153);
    }
}
