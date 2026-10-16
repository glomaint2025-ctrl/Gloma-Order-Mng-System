<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $order_id
 * @property ?int $user_id
 * @property string $body
 * @property \Illuminate\Support\Carbon $created_at
 * @property ?User $user
 */
class OrderNote extends Model
{
    protected $fillable = ['order_id', 'user_id', 'body'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
