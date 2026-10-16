<?php

use App\Support\Money;
use App\Support\Phone;
use App\Support\SmsSegments;

describe('Money', function () {
    it('adds and subtracts exactly without float errors', function () {
        expect(Money::add('0.10', '0.20'))->toBe('0.30')
            ->and(Money::sub('100.00', '0.01'))->toBe('99.99')
            ->and(Money::mul('1250.50', 3))->toBe('3751.50')
            ->and(Money::of(1250))->toBe('1250.00')
            ->and(Money::of(null))->toBe('0.00');
    });

    it('rounds half away from zero', function () {
        expect(Money::round('1.005'))->toBe('1.01')
            ->and(Money::round('1.004'))->toBe('1.00')
            ->and(Money::round('-1.005'))->toBe('-1.01');
    });

    it('computes a weighted average cost', function () {
        // 10 @ 100 + 10 @ 200 = 150
        expect(Money::weightedAverage(10, '100', 10, '200'))->toBe('150.00')
            ->and(Money::weightedAverage(0, '0', 5, '99.99'))->toBe('99.99')
            ->and(Money::weightedAverage(3, '10', 0, '0'))->toBe('10.00');
    });

    it('knows signs', function () {
        expect(Money::isNegative('-0.01'))->toBeTrue()
            ->and(Money::isZero('0.00'))->toBeTrue()
            ->and(Money::abs('-5'))->toBe('5.00')
            ->and(Money::neg('5'))->toBe('-5.00')
            ->and(Money::cmp('2', '10'))->toBe(-1);
    });
});

describe('Phone', function () {
    it('normalises Sri Lankan numbers to E.164', function (string $input) {
        expect(Phone::normalize($input))->toBe('+94771234567');
    })->with(['0771234567', '771234567', '+94771234567', '94771234567', '0094771234567', '077 123 4567', '077-123-4567']);

    it('rejects invalid numbers', function (?string $input) {
        expect(Phone::normalize($input))->toBeNull();
    })->with([null, '', '12345', '07712345678', '+1 202 555 0100', 'abc', '0071234567']);

    it('detects mobiles and formats local numbers', function () {
        expect(Phone::isMobile('+94771234567'))->toBeTrue()
            ->and(Phone::isMobile('+94112345678'))->toBeFalse()
            ->and(Phone::local('+94771234567'))->toBe('0771234567');
    });
});

describe('SMS segments', function () {
    it('counts GSM-7 messages at 160 / 153', function () {
        expect(SmsSegments::count(str_repeat('a', 160)))->toBe(1)
            ->and(SmsSegments::count(str_repeat('a', 161)))->toBe(2)
            ->and(SmsSegments::count(str_repeat('a', 306)))->toBe(2)
            ->and(SmsSegments::count(str_repeat('a', 307)))->toBe(3)
            ->and(SmsSegments::count(''))->toBe(0);
    });

    it('counts extension characters twice', function () {
        expect(SmsSegments::count(str_repeat('€', 80)))->toBe(1)
            ->and(SmsSegments::count(str_repeat('€', 81)))->toBe(2);
    });

    it('counts Sinhala (Unicode) at 70 / 67', function () {
        $sinhala = 'ඔබගේ ඇණවුම යවා ඇත';
        expect(SmsSegments::isUnicode($sinhala))->toBeTrue()
            ->and(SmsSegments::count(str_repeat('අ', 70)))->toBe(1)
            ->and(SmsSegments::count(str_repeat('අ', 71)))->toBe(2)
            ->and(SmsSegments::count(str_repeat('අ', 135)))->toBe(3);
    });
});
