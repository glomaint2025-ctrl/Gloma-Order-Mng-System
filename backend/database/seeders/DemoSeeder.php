<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Catalog\Models\Product;
use App\Domain\Couriers\Models\Courier;
use App\Domain\Couriers\Models\CourierAccount;
use App\Domain\Inventory\Actions\RecordPurchase;
use App\Domain\Shops\Actions\ManageShops;
use App\Domain\Shops\Models\Shop;
use App\Domain\Shops\Tenancy\TenantContext;
use App\Domain\Users\Perm;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;

/**
 * Local / UAT demo data. Logins (password "password"): admin@gloma.test, owner@gloma.test.
 * Never run in production.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (App::isProduction()) {
            $this->command?->error('DemoSeeder refuses to run in production.');

            return;
        }

        $this->call(DatabaseSeeder::class);

        $admin = User::query()->firstOrCreate(['email' => 'admin@gloma.test'], ['name' => 'Gloma Admin', 'password' => 'password']);
        $admin->assignRole(Perm::ROLE_ADMIN);
        auth()->setUser($admin);

        if (Shop::query()->where('code', 'DEMO')->exists()) {
            return;
        }

        $shop = app(ManageShops::class)->create([
            'name' => 'Demo Fashion Store',
            'code' => 'DEMO',
            'phone' => '0771234567',
            'email' => 'demo-shop@gloma.test',
            'address' => '12 Galle Road, Colombo 03',
            'contract_ref' => 'GL-2026-001',
            'owner' => ['name' => 'Demo Owner', 'email' => 'owner@gloma.test', 'password' => 'password', 'phone' => '0770000000'],
        ]);
        app(TenantContext::class)->set($shop);

        $products = collect([
            ['sku' => 'TSHIRT-BLK-M', 'name' => 'Black T-shirt (M)', 'price' => '2500.00'],
            ['sku' => 'TSHIRT-WHT-L', 'name' => 'White T-shirt (L)', 'price' => '2500.00'],
            ['sku' => 'CAP-RED', 'name' => 'Red cap', 'price' => '1800.00'],
        ])->map(fn ($p) => Product::create($p + ['shop_id' => $shop->id]));

        app(RecordPurchase::class)->handle($shop, $admin, [
            'reference' => 'PO-1001',
            'supplier' => 'Pettah Wholesale',
            'purchased_on' => now()->toDateString(),
            'lines' => $products->map(fn (Product $p) => ['product_id' => $p->id, 'qty' => 20, 'unit_cost' => '1200'])->all(),
        ]);

        foreach (Courier::all() as $courier) {
            CourierAccount::create(['shop_id' => null, 'courier_id' => $courier->id, 'label' => "Gloma - {$courier->name}", 'default_charge' => '400.00']);
        }
        CourierAccount::create(['shop_id' => $shop->id, 'courier_id' => Courier::query()->where('code', 'koombiyo')->value('id'), 'label' => 'Shop Koombiyo', 'default_charge' => '350.00']);

        app(TenantContext::class)->set(null);
    }
}
