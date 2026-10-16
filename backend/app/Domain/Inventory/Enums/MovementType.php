<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Enums;

use App\Support\HasLabels;

enum MovementType: string
{
    use HasLabels;

    case PurchaseIn = 'purchase_in';
    case OrderOut = 'order_out';
    case OrderEdit = 'order_edit';
    case OrderCancel = 'order_cancel';
    case ReturnIn = 'return_in';
    case Damage = 'damage';
    case Correction = 'correction';
    case TransferOut = 'transfer_out';
    case TransferIn = 'transfer_in';
    case Handover = 'handover';
    case ModeSwitch = 'mode_switch';

    public function label(): string
    {
        return match ($this) {
            self::PurchaseIn => 'Purchase',
            self::OrderOut => 'Order',
            self::OrderEdit => 'Order edited',
            self::OrderCancel => 'Order cancelled',
            self::ReturnIn => 'Returned',
            self::Damage => 'Damaged or lost',
            self::Correction => 'Correction',
            self::TransferOut => 'Transfer out',
            self::TransferIn => 'Transfer in',
            self::Handover => 'Handed back to shop',
            self::ModeSwitch => 'Stock mode switch',
        };
    }

    /** @return list<self> Types an admin can enter by hand on the Stock screen. */
    public static function manualAdjustments(): array
    {
        return [self::Correction, self::Damage, self::Handover];
    }
}
