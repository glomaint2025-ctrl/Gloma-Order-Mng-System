<?php

declare(strict_types=1);

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Enums\LedgerType;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Shops\Enums\Party;
use App\Support\Money;

/**
 * The ONLY way money entries are written (CLAUDE.md rule 2). Append-only; the sign comes from the type.
 */
final class MoneyLedger
{
    /**
     * @param  string  $amount  Positive amount. For Adjustment, pass a signed amount.
     * @param  array{order_id?: int|null, stock_purchase_id?: int|null, occurred_on?: string|null}  $links
     */
    public function record(
        int $shopId,
        LedgerType $type,
        string $amount,
        ?Party $party = null,
        ?string $description = null,
        array $links = [],
        ?int $userId = null,
    ): LedgerEntry {
        $party = $type->fixedParty() ?? $party;
        if ($party === null) {
            throw new \InvalidArgumentException("Ledger type {$type->value} needs a party.");
        }

        $signed = match ($type->sign()) {
            1 => Money::abs($amount),
            -1 => Money::neg(Money::abs($amount)),
            default => Money::of($amount),
        };

        return LedgerEntry::create([
            'shop_id' => $shopId,
            'party' => $party,
            'type' => $type,
            'amount' => $signed,
            'order_id' => $links['order_id'] ?? null,
            'stock_purchase_id' => $links['stock_purchase_id'] ?? null,
            'description' => $description,
            'occurred_on' => $links['occurred_on'] ?? now()->toDateString(),
            'created_by' => $userId ?? auth()->id(),
        ]);
    }
}
