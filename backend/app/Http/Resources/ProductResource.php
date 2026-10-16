<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Shops\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin Product */
class ProductResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $shop = app(TenantContext::class)->shop();
        $levels = $this->relationLoaded('stockLevels') ? $this->stockLevels : $this->stockLevels()->get();
        $locations = $shop ? StockLocation::forMode($shop->stock_mode) : [StockLocation::Shared];

        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'price' => $this->price,
            'avg_cost' => $this->avg_cost,
            'is_active' => $this->is_active,
            'stock' => [
                'total' => (int) $levels->sum('qty'),
                'by_location' => array_map(fn (StockLocation $loc) => [
                    'location' => $loc->toArray(),
                    'qty' => (int) $levels->where('location', $loc)->sum('qty'),
                ], $locations),
            ],
        ];
    }
}
