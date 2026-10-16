<?php

declare(strict_types=1);

namespace App\Domain\Shops\Actions;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Orders\Enums\PaymentMethodKind;
use App\Domain\Orders\Models\PaymentMethod;
use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Enums\StockMode;
use App\Domain\Shops\Models\Shop;
use App\Domain\Users\Perm;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * Admin onboarding (F1, D05): a shop and its owner login are created together after the contract is signed.
 */
final class ManageShops
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data  shop fields + owner: {user_id} or {name, email, password, phone}
     */
    public function create(array $data): Shop
    {
        return DB::transaction(function () use ($data) {
            $shop = Shop::create([
                ...collect($data)->only(['name', 'contract_ref', 'contract_started_on', 'phone', 'email', 'address', 'notes'])->all(),
                'code' => strtoupper((string) $data['code']),
                'status' => ShopStatus::Active,
                'stock_mode' => StockMode::from($data['stock_mode'] ?? StockMode::Single->value),
            ]);

            $owner = $this->resolveOwner($data['owner'] ?? []);
            $shop->owners()->attach($owner->id);

            // Sensible starting payment methods (D38); the shop can edit them.
            PaymentMethod::create(['shop_id' => $shop->id, 'name' => 'Cash on delivery', 'kind' => PaymentMethodKind::Cod, 'requires_slip' => false]);
            PaymentMethod::create(['shop_id' => $shop->id, 'name' => 'Bank transfer', 'kind' => PaymentMethodKind::Prepaid, 'requires_slip' => true]);
            PaymentMethod::create(['shop_id' => $shop->id, 'name' => 'Cash', 'kind' => PaymentMethodKind::Prepaid, 'requires_slip' => false]);

            $this->audit->log('shop.created', $shop, ['code' => $shop->code, 'owner_id' => $owner->id], $shop->id);

            return $shop->load('owners');
        });
    }

    /** @param array<string, mixed> $data */
    public function update(Shop $shop, array $data): Shop
    {
        $shop->fill(collect($data)->only(['name', 'contract_ref', 'contract_started_on', 'phone', 'email', 'address', 'notes'])->all());
        $shop->save();
        $this->audit->logModelChange('shop.updated', $shop);

        return $shop;
    }

    public function setStatus(Shop $shop, ShopStatus $status): Shop
    {
        $from = $shop->status;
        $shop->status = $status;
        $shop->save();
        $this->audit->log('shop.status_changed', $shop, ['from' => $from->value, 'to' => $status->value], $shop->id);

        return $shop;
    }

    /** @param array<string, mixed> $owner */
    public function addOwner(Shop $shop, array $owner): User
    {
        $user = $this->resolveOwner($owner);
        $shop->owners()->syncWithoutDetaching([$user->id]);
        $this->audit->log('shop.owner_added', $shop, ['user_id' => $user->id], $shop->id);

        return $user;
    }

    public function removeOwner(Shop $shop, User $user): void
    {
        if ($shop->owners()->count() <= 1) {
            throw new BusinessRuleException('last_owner', 'A shop needs at least one owner.');
        }
        $shop->owners()->detach($user->id);
        $this->audit->log('shop.owner_removed', $shop, ['user_id' => $user->id], $shop->id);
    }

    /** @param array<string, mixed> $owner */
    private function resolveOwner(array $owner): User
    {
        if (! empty($owner['user_id'])) {
            $user = User::query()->findOrFail($owner['user_id']);
            if ($user->isGlomaAdmin()) {
                throw new BusinessRuleException('invalid_owner', 'A Gloma admin cannot be a shop owner.', 422);
            }

            return $user;
        }

        if (empty($owner['email']) || empty($owner['password']) || empty($owner['name'])) {
            throw new BusinessRuleException('owner_required', 'Give an existing owner or a new owner name, email and password.', 422);
        }

        $user = User::create([
            'name' => $owner['name'],
            'email' => strtolower((string) $owner['email']),
            'password' => $owner['password'],
            'phone' => $owner['phone'] ?? null,
        ]);
        $user->assignRole(Perm::ROLE_OWNER);
        $this->audit->log('user.created', $user, ['email' => $user->email, 'role' => Perm::ROLE_OWNER]);

        return $user;
    }
}
