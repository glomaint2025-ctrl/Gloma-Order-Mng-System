<?php

/**
 * SPIKE-1: N parallel processes each try to sell 1 unit of a product that has only 1 left (MySQL row locks).
 * Pass = exactly one order succeeds and stock ends at 0.
 *
 *   php scripts/spike-concurrency.php setup            # seeds a shop + product with 1 unit, prints ids
 *   php scripts/spike-concurrency.php sell <shop> <product> <user>   # one attempt (run many in parallel)
 *   php scripts/spike-concurrency.php check <product>  # prints final stock and order count
 *
 * Needs DB_CONNECTION=mysql (see scripts/spike-concurrency.sh).
 */

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Inventory\Services\StockLedger;
use App\Domain\Orders\Actions\PlaceOrder;
use App\Domain\Orders\Enums\PaymentMethodKind;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\PaymentMethod;
use App\Domain\Shops\Models\Shop;
use App\Domain\Users\Perm;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$cmd = $argv[1] ?? '';

if ($cmd === 'setup') {
    $shop = Shop::factory()->create(['code' => 'SPK'.random_int(100, 999)]);
    PaymentMethod::create(['shop_id' => $shop->id, 'name' => 'COD', 'kind' => PaymentMethodKind::Cod]);
    $product = Product::factory()->create(['shop_id' => $shop->id]);
    app(StockLedger::class)->move($product, StockLocation::Shared, 1, MovementType::Correction, 'spike');
    $owner = User::factory()->create();
    $owner->assignRole(Perm::ROLE_OWNER);
    $shop->owners()->attach($owner->id);
    $admin = User::factory()->create();
    $admin->assignRole(Perm::ROLE_ADMIN);
    echo "{$shop->id} {$product->id} {$owner->id} {$admin->id}\n";
    exit(0);
}

if ($cmd === 'sell') {
    [$shopId, $productId, $userId] = array_map('intval', array_slice($argv, 2, 3));
    $shop = Shop::findOrFail($shopId);
    $user = User::findOrFail($userId);
    auth()->setUser($user);
    try {
        $order = app(PlaceOrder::class)->handle($shop, $user, [
            'channel' => 'walk_in',
            'payment_method_id' => PaymentMethod::withoutGlobalScopes()->where('shop_id', $shopId)->value('id'),
            'items' => [['product_id' => $productId, 'qty' => 1]],
        ]);
        echo "SOLD {$order->number}\n";
    } catch (BusinessRuleException $e) {
        echo "REFUSED {$e->errorCode}\n";
    }
    exit(0);
}

if ($cmd === 'check') {
    $productId = (int) ($argv[2] ?? 0);
    $stock = (int) StockLevel::withoutGlobalScopes()->where('product_id', $productId)->sum('qty');
    $orders = Order::withoutGlobalScopes()->whereHas('items', fn ($q) => $q->where('product_id', $productId))->count();
    echo "stock={$stock} orders={$orders}\n";
    exit($stock === 0 && $orders === 1 ? 0 : 1);
}

fwrite(STDERR, "usage: setup | sell <shop> <product> <user> | check <product>\n");
exit(2);
