<?php

use App\Domain\Catalog\Models\Product;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockLevel;
use App\Domain\Inventory\Models\StockMovement;

beforeEach(function () {
    $this->shop = shop();
    $this->owner = ownerOf($this->shop);
    $this->admin = admin();
    $this->base = "/api/v1/shops/{$this->shop->id}";
});

it('lets only Gloma admin create products', function () {
    $body = ['sku' => 'TS-1', 'name' => 'T-shirt', 'price' => '2500'];
    $this->actingAs($this->owner)->postJson("{$this->base}/products", $body)->assertForbidden();
    $this->actingAs($this->admin)->postJson("{$this->base}/products", $body)->assertCreated()
        ->assertJsonPath('data.stock.total', 0)
        ->assertJsonPath('data.stock.by_location.0.location.value', 'shared');
    $this->actingAs($this->admin)->postJson("{$this->base}/products", $body)->assertStatus(422)->assertJsonValidationErrors('sku');
});

it('records a purchase: stock in, weighted average cost, ledger, audit', function () {
    $p = Product::factory()->create(['shop_id' => $this->shop->id, 'avg_cost' => '0']);

    $this->actingAs($this->admin)->postJson("{$this->base}/purchases", [
        'reference' => 'PO-1', 'supplier' => 'Pettah', 'purchased_on' => now()->toDateString(),
        'lines' => [['product_id' => $p->id, 'qty' => 10, 'unit_cost' => '100']],
    ])->assertCreated()->assertJsonPath('data.total', '1000.00');

    $this->actingAs($this->admin)->postJson("{$this->base}/purchases", [
        'purchased_on' => now()->toDateString(),
        'lines' => [['product_id' => $p->id, 'qty' => 10, 'unit_cost' => '200']],
    ])->assertCreated();

    expect(stockOf($p))->toBe(20)
        ->and($p->fresh()->avg_cost)->toBe('150.00')
        ->and(LedgerEntry::withoutGlobalScopes()->where('type', 'purchase')->sum('amount'))->toEqual(-3000)
        ->and(\App\Domain\Audit\Models\AuditLog::query()->where('action', 'purchase.recorded')->count())->toBe(2);

    $this->actingAs($this->owner)->getJson("{$this->base}/purchases")->assertOk()->assertJsonPath('data.0.total', '2000.00');
    $this->actingAs($this->owner)->postJson("{$this->base}/purchases", ['purchased_on' => now()->toDateString(), 'lines' => []])->assertForbidden();
});

it('rejects a purchase location that the stock mode does not use', function () {
    $p = Product::factory()->create(['shop_id' => $this->shop->id]);
    $this->actingAs($this->admin)->postJson("{$this->base}/purchases", [
        'purchased_on' => now()->toDateString(),
        'lines' => [['product_id' => $p->id, 'qty' => 1, 'unit_cost' => '1', 'location' => 'gloma']],
    ])->assertStatus(422)->assertJsonPath('code', 'invalid_location');
});

it('adjusts stock with a reason: correction ±, damage and handover always out, never below zero', function () {
    $p = stockedProduct($this->shop, 5);
    $post = fn (array $b) => $this->actingAs($this->admin)->postJson("{$this->base}/stock/adjustments", $b + ['product_id' => $p->id]);

    $post(['type' => 'correction', 'qty' => 3, 'reason' => 'Recount'])->assertCreated()->assertJsonPath('data.qty', 3);
    $post(['type' => 'damage', 'qty' => 2, 'reason' => 'Wet'])->assertCreated()->assertJsonPath('data.qty', -2);
    $post(['type' => 'handover', 'qty' => 100, 'reason' => 'Contract end'])->assertStatus(409)->assertJsonPath('code', 'insufficient_stock');
    $post(['type' => 'correction', 'qty' => 1])->assertStatus(422)->assertJsonValidationErrors('reason');
    $post(['type' => 'purchase_in', 'qty' => 1, 'reason' => 'x'])->assertStatus(422);

    expect(stockOf($p))->toBe(6);
    $this->actingAs($this->owner)->postJson("{$this->base}/stock/adjustments", ['product_id' => $p->id, 'type' => 'correction', 'qty' => 1, 'reason' => 'x'])->assertForbidden();
});

it('keeps stock level equal to the sum of movements (ledger invariant)', function () {
    $p = stockedProduct($this->shop, 10);
    $owner = $this->owner;
    $id = placeOrder($owner, $this->shop, $p, 3)->json('data.id');
    $this->actingAs($owner)->postJson("{$this->base}/orders/{$id}/cancel", ['reason' => 'x']);
    placeOrder($owner, $this->shop, $p, 2);
    $this->actingAs($this->admin)->postJson("{$this->base}/stock/adjustments", ['product_id' => $p->id, 'type' => 'damage', 'qty' => 1, 'reason' => 'x']);

    $movements = (int) StockMovement::withoutGlobalScopes()->where('product_id', $p->id)->sum('qty');
    expect($movements)->toBe(stockOf($p))->and($movements)->toBe(7);
    $this->actingAs($owner)->getJson("{$this->base}/stock/movements?product_id={$p->id}")->assertOk()->assertJsonCount(5, 'data')
        ->assertJsonPath('data.0.type.value', 'damage');
});

it('switches to by-location with a split, transfers, and back to single', function () {
    $p = stockedProduct($this->shop, 10);
    $mode = "{$this->base}/stock/mode";

    $this->actingAs($this->admin)->postJson($mode, ['stock_mode' => 'by_location', 'split' => [['product_id' => $p->id, 'gloma' => 4, 'shop' => 5]]])
        ->assertStatus(422)->assertJsonPath('code', 'split_mismatch');
    $this->actingAs($this->admin)->postJson($mode, ['stock_mode' => 'by_location', 'split' => [['product_id' => $p->id, 'gloma' => 4, 'shop' => 6]]])
        ->assertOk()->assertJsonPath('data.stock_mode.value', 'by_location');

    expect(stockOf($p, StockLocation::Gloma))->toBe(4)->and(stockOf($p, StockLocation::Shop))->toBe(6)->and(stockOf($p, StockLocation::Shared))->toBe(0);

    $this->actingAs($this->admin)->postJson("{$this->base}/stock/transfers", ['product_id' => $p->id, 'from' => 'shop', 'to' => 'gloma', 'qty' => 2])->assertCreated()
        ->assertJsonPath('data.stock.by_location.0.qty', 6);

    $this->actingAs($this->admin)->postJson($mode, ['stock_mode' => 'single'])->assertOk();
    expect(stockOf($p, StockLocation::Shared))->toBe(10)->and(stockOf($p))->toBe(10);
    $this->actingAs($this->admin)->postJson("{$this->base}/stock/transfers", ['product_id' => $p->id, 'from' => 'shop', 'to' => 'gloma', 'qty' => 1])
        ->assertStatus(409)->assertJsonPath('code', 'wrong_stock_mode');
});

it('returns stock to the right place after a mode switch on an open order', function () {
    $p = stockedProduct($this->shop, 5);
    $id = placeOrder($this->owner, $this->shop, $p, 2)->json('data.id'); // taken from "shared"
    $this->actingAs($this->admin)->postJson("{$this->base}/stock/mode", ['stock_mode' => 'by_location', 'split' => [['product_id' => $p->id, 'gloma' => 1, 'shop' => 2]]])->assertOk();

    $this->actingAs($this->owner)->postJson("{$this->base}/orders/{$id}/cancel", ['reason' => 'x'])->assertOk();
    expect(stockOf($p, StockLocation::Shop))->toBe(4)->and(StockLevel::withoutGlobalScopes()->where('location', 'shared')->sum('qty'))->toEqual(0);
});
