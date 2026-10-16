<?php

declare(strict_types=1);

namespace App\Support;

/**
 * For backed enums: label() + options() so the UI never hard-codes labels.
 */
trait HasLabels
{
    abstract public function label(): string;

    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(fn (self $case) => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }

    /** @return array{value: string, label: string} */
    public function toArray(): array
    {
        return ['value' => $this->value, 'label' => $this->label()];
    }
}
