<?php

use App\Domain\Catalog\Models\Product;
use App\Domain\Couriers\Models\Courier;
use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Orders\Enums\PaymentMethodKind;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\PaymentMethod;
use App\Domain\Shops\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
| Helpers. Tests never hit the real network (CLAUDE.md rule 8).
*/

function admin(): User
{
    return User::factory()->admin()->create(['name' => 'Gloma Admin']);
}

function ownerOf(Shop $shop): User
{
    $user = User::factory()->owner()->create(['name' => 'Shop Owner']);
    $shop->owners()->attach($user->id);

    return $user;
}

function shop(array $attributes = []): Shop
{
    $shop = Shop::factory()->create($attributes);
    PaymentMethod::create(['shop_id' => $shop->id, 'name' => 'Cash on delivery', 'kind' => PaymentMethodKind::Cod, 'requires_slip' => false]);
    PaymentMethod::create(['shop_id' => $shop->id, 'name' => 'Bank transfer', 'kind' => PaymentMethodKind::Prepaid, 'requires_slip' => true]);

    return $shop;
}

function codMethod(Shop $shop): PaymentMethod
{
    return PaymentMethod::withoutGlobalScopes()->where('shop_id', $shop->id)->where('kind', 'cod')->firstOrFail();
}

function bankMethod(Shop $shop): PaymentMethod
{
    return PaymentMethod::withoutGlobalScopes()->where('shop_id', $shop->id)->where('name', 'Bank transfer')->firstOrFail();
}

/** A product with stock already in (bypasses purchases; uses the real StockLedger). */
function stockedProduct(Shop $shop, int $qty = 10, array $attributes = [], ?StockLocation $location = null): Product
{
    $product = Product::factory()->create(['shop_id' => $shop->id] + $attributes);
    if ($qty > 0) {
        app(StockLedger::class)->move($product, $location ?? StockLocation::forMode($shop->stock_mode)[0], $qty, MovementType::Correction, 'test stock');
    }

    return $product;
}

function stockOf(Product $product, ?StockLocation $location = null): int
{
    $q = StockLevel::withoutGlobalScopes()->where('product_id', $product->id);
    if ($location) {
        $q->where('location', $location->value);
    }

    return (int) $q->sum('qty');
}

function glomaCourierAccount(string $code = 'koombiyo', ?string $charge = '400.00'): CourierAccount
{
    return CourierAccount::create(['shop_id' => null, 'courier_id' => Courier::query()->where('code', $code)->value('id'), 'label' => 'Gloma '.$code, 'default_charge' => $charge]);
}

function shopCourierAccount(Shop $shop, string $code = 'fardar'): CourierAccount
{
    return CourierAccount::create(['shop_id' => $shop->id, 'courier_id' => Courier::query()->where('code', $code)->value('id'), 'label' => 'Shop '.$code, 'default_charge' => '350.00']);
}

/** @return array<string, mixed> */
function orderPayload(Shop $shop, Product $product, int $qty = 1, array $overrides = []): array
{
    return array_replace_recursive([
        'channel' => 'delivery',
        'payment_method_id' => codMethod($shop)->id,
        'customer' => [
            'phone' => '0771234567',
            'name' => 'Kamal Perera',
            'email' => 'kamal@example.com',
            'address' => '10 Temple Road',
            'city' => 'Kandy',
        ],
        'items' => [['product_id' => $product->id, 'qty' => $qty]],
        'delivery_fee' => '350',
    ], $overrides);
}

function placeOrder(User $user, Shop $shop, Product $product, int $qty = 1, array $overrides = []): TestResponse
{
    return test()->actingAs($user)->postJson("/api/v1/shops/{$shop->id}/orders", orderPayload($shop, $product, $qty, $overrides));
}

/** Drive an order through the lifecycle up to (and including) the given step. */
function advance(User $user, Shop $shop, int $orderId, string $until): TestResponse
{
    $steps = ['confirm', 'pack', 'dispatch', 'deliver'];
    $response = null;
    foreach ($steps as $step) {
        $body = $step === 'dispatch'
            ? ['courier_account_id' => Order::withoutGlobalScopes()->find($orderId)->seller->value === 'gloma'
                ? (CourierAccount::query()->whereNull('shop_id')->value('id') ?? glomaCourierAccount()->id)
                : (CourierAccount::query()->where('shop_id', $shop->id)->value('id') ?? shopCourierAccount($shop)->id),
                'tracking_number' => 'TRK'.$orderId]
            : [];
        $response = test()->actingAs($user)->postJson("/api/v1/shops/{$shop->id}/orders/{$orderId}/{$step}", $body);
        $response->assertOk();
        if ($step === $until) {
            break;
        }
    }

    return $response;
}
