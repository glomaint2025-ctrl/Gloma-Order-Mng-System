<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Enums;

use App\Support\HasLabels;

enum MessageChannel: string
{
    use HasLabels;

    case Sms = 'sms';
    case Email = 'email';

    public function label(): string
    {
        return match ($this) {
            self::Sms => 'SMS',
            self::Email => 'Email',
        };
    }
}
