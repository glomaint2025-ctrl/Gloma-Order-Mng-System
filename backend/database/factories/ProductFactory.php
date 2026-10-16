<?php

namespace Database\Factories;

use App\Domain\Catalog\Models\Product;
use App\Domain\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'shop_id' => Shop::factory(),
            'sku' => strtoupper(Str::random(8)),
            'name' => ucfirst(fake()->words(2, true)),
            'price' => '2500.00',
            'avg_cost' => '1500.00',
            'is_active' => true,
        ];
    }
}
