<?php

use App\Domain\Catalog\Models\Product;
use App\Domain\Customers\Models\Customer;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Tenancy\TenantContext;

/*
| Success measure 3: a shop can never read another shop's data.
*/

beforeEach(function () {
    $this->shopA = shop(['name' => 'Shop A']);
    $this->shopB = shop(['name' => 'Shop B']);
    $this->ownerA = ownerOf($this->shopA);
    $this->ownerB = ownerOf($this->shopB);
    $this->productB = stockedProduct($this->shopB, 5);
    $this->orderB = placeOrder($this->ownerB, $this->shopB, $this->productB)->assertCreated()->json('data.id');
});

it('hides another shop entirely (404, not 403)', function () {
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$this->shopB->id}/orders")->assertNotFound();
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$this->shopB->id}/dashboard")->assertNotFound();
});

it('cannot reach another shop\'s rows through its own shop URL', function () {
    $a = $this->shopA->id;
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$a}/orders/{$this->orderB}")->assertNotFound();
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$a}/products/{$this->productB->id}")->assertNotFound();
    $this->actingAs($this->ownerA)->postJson("/api/v1/shops/{$a}/orders/{$this->orderB}/confirm")->assertNotFound();
    $customerB = Customer::withoutGlobalScopes()->where('shop_id', $this->shopB->id)->first();
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$a}/customers/{$customerB->id}")->assertNotFound();
});

it('lists only the current shop\'s rows', function () {
    stockedProduct($this->shopA, 3);
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$this->shopA->id}/orders")->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$this->shopA->id}/products")->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$this->shopA->id}/customers")->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($this->ownerA)->getJson("/api/v1/shops/{$this->shopA->id}/ledger")->assertOk()->assertJsonCount(0, 'data');
});

it('cannot order another shop\'s product', function () {
    placeOrder($this->ownerA, $this->shopA, $this->productB)->assertStatus(422)->assertJsonPath('code', 'invalid_product');
    expect(stockOf($this->productB))->toBe(4);
});

it('scopes every tenant model when a tenant is set', function () {
    app(TenantContext::class)->set($this->shopA);
    expect(Order::count())->toBe(0)
        ->and(Product::count())->toBe(0)
        ->and(Customer::count())->toBe(0)
        ->and(LedgerEntry::count())->toBe(0);
    app(TenantContext::class)->set($this->shopB);
    expect(Order::count())->toBe(1)->and(Product::count())->toBe(1);
    app(TenantContext::class)->set(null);
});

it('lets Gloma admin into any shop', function () {
    $this->actingAs(admin())->getJson("/api/v1/shops/{$this->shopB->id}/orders/{$this->orderB}")->assertOk();
});

it('blocks owners of suspended shops but not the admin', function () {
    $this->shopB->update(['status' => ShopStatus::Suspended]);
    $this->actingAs($this->ownerB)->getJson("/api/v1/shops/{$this->shopB->id}/orders")
        ->assertForbidden()->assertJsonPath('code', 'shop_suspended');
    $this->actingAs(admin())->getJson("/api/v1/shops/{$this->shopB->id}/orders")->assertOk();
});

it('makes closed shops read-only for owners', function () {
    $this->shopB->update(['status' => ShopStatus::Closed]);
    $this->actingAs($this->ownerB)->getJson("/api/v1/shops/{$this->shopB->id}/orders")->assertOk();
    placeOrder($this->ownerB, $this->shopB, $this->productB)->assertStatus(409)->assertJsonPath('code', 'shop_closed');
    $this->actingAs($this->ownerB)->postJson("/api/v1/shops/{$this->shopB->id}/orders/{$this->orderB}/confirm")
        ->assertStatus(409)->assertJsonPath('code', 'shop_closed');
});
