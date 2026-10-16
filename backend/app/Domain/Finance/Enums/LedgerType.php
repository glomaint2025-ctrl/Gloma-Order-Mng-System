<?php

declare(strict_types=1);

namespace App\Domain\Finance\Enums;

use App\Domain\Shops\Enums\Party;
use App\Support\HasLabels;

/**
 * Ledger entry types. "party" = whose hands the money is in; amount sign = in (+) or out (−) of those hands.
 */
enum LedgerType: string
{
    use HasLabels;

    case ShopPayment = 'shop_payment';
    case Purchase = 'purchase';
    case OrderPayment = 'order_payment';
    case Refund = 'refund';
    case CourierCharge = 'courier_charge';
    case ReturnCharge = 'return_charge';
    case GlomaFee = 'gloma_fee';
    case Payout = 'payout';
    case Adjustment = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::ShopPayment => 'Money received from shop',
            self::Purchase => 'Stock purchase',
            self::OrderPayment => 'Order payment',
            self::Refund => 'Refund',
            self::CourierCharge => 'Courier charge',
            self::ReturnCharge => 'Return charge',
            self::GlomaFee => 'Gloma fee',
            self::Payout => 'Payout to shop',
            self::Adjustment => 'Adjustment',
        };
    }

    /** +1 = money in, −1 = money out, 0 = either (sign given by the user). */
    public function sign(): int
    {
        return match ($this) {
            self::ShopPayment, self::OrderPayment, self::GlomaFee => 1,
            self::Purchase, self::Refund, self::CourierCharge, self::ReturnCharge, self::Payout => -1,
            self::Adjustment => 0,
        };
    }

    /** Fixed party for types that always belong to Gloma; null = depends on the order seller or the user. */
    public function fixedParty(): ?Party
    {
        return match ($this) {
            self::ShopPayment, self::Purchase, self::GlomaFee, self::Payout => Party::Gloma,
            default => null,
        };
    }

    /** @return list<self> Types an admin may enter by hand on the Money screen. */
    public static function manual(): array
    {
        return [self::ShopPayment, self::GlomaFee, self::Payout, self::Adjustment];
    }
}
