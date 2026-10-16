<?php

declare(strict_types=1);

namespace App\Models;

use App\Domain\Shops\Enums\Party;
use App\Domain\Shops\Models\Shop;
use App\Domain\Users\Perm;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property bool $is_active
 * @property ?string $phone
 * @property ?Carbon $last_login_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'phone', 'is_active'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsToMany<Shop, $this> */
    public function shops(): BelongsToMany
    {
        return $this->belongsToMany(Shop::class);
    }

    public function isGlomaAdmin(): bool
    {
        return $this->hasRole(Perm::ROLE_ADMIN);
    }

    /** The side this user sells for: Gloma admin sells as Gloma, an owner sells as the shop. */
    public function party(): Party
    {
        return $this->isGlomaAdmin() ? Party::Gloma : Party::Shop;
    }

    public function canAccessShop(Shop $shop): bool
    {
        return $this->isGlomaAdmin() || $this->shops()->whereKey($shop->id)->exists();
    }
}
