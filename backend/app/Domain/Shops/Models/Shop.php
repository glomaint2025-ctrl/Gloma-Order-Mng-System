<?php

declare(strict_types=1);

namespace App\Domain\Shops\Models;

use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Enums\StockMode;
use App\Models\User;
use Database\Factories\ShopFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $code
 * @property ShopStatus $status
 * @property StockMode $stock_mode
 * @property int $order_seq
 * @property ?string $contract_ref
 * @property ?Carbon $contract_started_on
 * @property ?string $phone
 * @property ?string $email
 * @property ?string $address
 * @property ?string $notes
 * @property ?Carbon $created_at
 */
class Shop extends Model
{
    /** @use HasFactory<ShopFactory> */
    use HasFactory;

    protected $fillable = [
        'name', 'code', 'status', 'stock_mode', 'contract_ref', 'contract_started_on',
        'phone', 'email', 'address', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => ShopStatus::class,
            'stock_mode' => StockMode::class,
            'contract_started_on' => 'date',
        ];
    }

    /** @return BelongsToMany<User, $this> */
    public function owners(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function isClosed(): bool
    {
        return $this->status === ShopStatus::Closed;
    }

    public function isByLocation(): bool
    {
        return $this->stock_mode === StockMode::ByLocation;
    }

    protected static function newFactory(): ShopFactory
    {
        return ShopFactory::new();
    }
}
