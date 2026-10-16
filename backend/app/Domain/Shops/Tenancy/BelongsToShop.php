<?php

declare(strict_types=1);

namespace App\Domain\Shops\Tenancy;

use App\Domain\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant-owned model: auto-scoped to the current shop and auto-filled with shop_id.
 *
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait BelongsToShop
{
    public static function bootBelongsToShop(): void
    {
        static::addGlobalScope('shop', function (Builder $builder): void {
            $tenant = app(TenantContext::class);
            if ($tenant->has()) {
                $builder->where($builder->getModel()->getTable().'.shop_id', $tenant->id());
            }
        });

        static::creating(function ($model): void {
            $tenant = app(TenantContext::class);
            if (empty($model->shop_id) && $tenant->has()) {
                $model->shop_id = $tenant->id();
            }
        });
    }

    /** @return BelongsTo<Shop, $this> */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }
}
