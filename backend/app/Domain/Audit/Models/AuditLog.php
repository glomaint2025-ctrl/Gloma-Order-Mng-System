<?php

declare(strict_types=1);

namespace App\Domain\Audit\Models;

use App\Domain\Shops\Models\Shop;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Who changed what, and when (PDPA). Append-only.
 *
 * @property int $id
 * @property ?int $user_id
 * @property ?int $shop_id
 * @property string $action
 * @property ?string $subject_type
 * @property ?int $subject_id
 * @property ?array<string, mixed> $changes
 * @property ?string $ip
 * @property Carbon $created_at
 */
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['changes' => 'array'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Shop, $this> */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }
}
