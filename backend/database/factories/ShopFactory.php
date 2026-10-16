<?php

namespace Database\Factories;

use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Enums\StockMode;
use App\Domain\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Shop>
 */
class ShopFactory extends Factory
{
    protected $model = Shop::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'code' => strtoupper(Str::random(5)),
            'status' => ShopStatus::Active,
            'stock_mode' => StockMode::Single,
            'phone' => '0112345678',
            'email' => fake()->companyEmail(),
            'address' => fake()->streetAddress(),
        ];
    }

    public function byLocation(): static
    {
        return $this->state(['stock_mode' => StockMode::ByLocation]);
    }
}
