<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Timeline row for an order ("Packed by Nimal at 10:42").
 *
 * @property int $id
 * @property int $order_id
 * @property ?int $user_id
 * @property string $type
 * @property ?string $from_status
 * @property ?string $to_status
 * @property ?array<string, mixed> $meta
 * @property \Illuminate\Support\Carbon $created_at
 * @property ?User $user
 */
class OrderEvent extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
