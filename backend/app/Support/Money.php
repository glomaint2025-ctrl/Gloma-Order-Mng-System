<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Exact LKR arithmetic on decimal strings (bcmath). Never use floats for money.
 */
final class Money
{
    public const SCALE = 2;

    public static function of(string|int|null $amount): string
    {
        if ($amount === null || $amount === '') {
            return '0.00';
        }

        return self::round((string) $amount);
    }

    public static function add(string ...$amounts): string
    {
        $sum = '0';
        foreach ($amounts as $amount) {
            $sum = bcadd($sum, self::of($amount), self::SCALE);
        }

        return self::of($sum);
    }

    public static function sub(string $a, string $b): string
    {
        return bcsub(self::of($a), self::of($b), self::SCALE);
    }

    public static function mul(string $amount, int $qty): string
    {
        return bcmul(self::of($amount), (string) $qty, self::SCALE);
    }

    public static function neg(string $amount): string
    {
        return bcmul(self::of($amount), '-1', self::SCALE);
    }

    public static function abs(string $amount): string
    {
        return self::isNegative($amount) ? self::neg($amount) : self::of($amount);
    }

    public static function cmp(string $a, string $b): int
    {
        return bccomp(self::of($a), self::of($b), self::SCALE);
    }

    public static function isNegative(string $amount): bool
    {
        return bccomp(self::of($amount), '0', self::SCALE) < 0;
    }

    public static function isZero(string $amount): bool
    {
        return bccomp(self::of($amount), '0', self::SCALE) === 0;
    }

    /** Weighted average of two (qty, unit) pairs, rounded half-up to 2 dp. */
    public static function weightedAverage(int $qtyA, string $unitA, int $qtyB, string $unitB): string
    {
        $totalQty = $qtyA + $qtyB;
        if ($totalQty <= 0) {
            return self::of($unitB);
        }
        $total = bcadd(bcmul(self::of($unitA), (string) $qtyA, 4), bcmul(self::of($unitB), (string) $qtyB, 4), 4);

        return self::round(bcdiv($total, (string) $totalQty, 6));
    }

    /** Round half away from zero to 2 dp. */
    public static function round(string $value): string
    {
        if (! is_numeric($value)) {
            throw new \InvalidArgumentException("Not a number: {$value}");
        }
        $offset = str_starts_with(ltrim($value), '-') ? '-0.005' : '0.005';

        return bcadd(bcadd($value, $offset, 6), '0', self::SCALE);
    }
}
