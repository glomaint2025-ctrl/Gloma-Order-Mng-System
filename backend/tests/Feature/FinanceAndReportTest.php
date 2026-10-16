<?php

use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Actions\RecordPurchase;

/*
| Success measure 4: the sales report matches orders and ledger to the cent.
*/

beforeEach(function () {
    $this->shop = shop();
    $this->owner = ownerOf($this->shop);
    $this->admin = admin();
    $this->base = "/api/v1/shops/{$this->shop->id}";
    $this->product = Product::factory()->create(['shop_id' => $this->shop->id, 'price' => '2000.00', 'avg_cost' => '0']);
    $this->actingAs($this->admin);
    app(RecordPurchase::class)->handle($this->shop, $this->admin, [
        'purchased_on' => now()->toDateString(),
        'lines' => [['product_id' => $this->product->id, 'qty' => 10, 'unit_cost' => '1200']],
    ]);
});

it('builds the sales report and dashboard from real orders and ledger', function () {
    // Shop sells 2 (delivered + paid), Gloma sells 1 walk-in, 1 shop order returned, 1 cancelled.
    $shopOrder = placeOrder($this->owner, $this->shop, $this->product, 2)->json('data.id');
    advance($this->owner, $this->shop, $shopOrder, 'deliver'); // courier charge 350 from default
    $this->actingAs($this->owner)->postJson("{$this->base}/orders/{$shopOrder}/payments")->assertOk();

    $this->actingAs($this->admin)->postJson("{$this->base}/orders", [
        'channel' => 'walk_in', 'payment_method_id' => codMethod($this->shop)->id,
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'unit_price' => '1900']],
    ])->assertCreated();

    $returned = placeOrder($this->owner, $this->shop, $this->product, 1)->json('data.id');
    advance($this->owner, $this->shop, $returned, 'dispatch');
    $this->actingAs($this->owner)->postJson("{$this->base}/orders/{$returned}/return", ['reason' => 'Refused', 'return_charge' => '150'])->assertOk();

    $cancelled = placeOrder($this->owner, $this->shop, $this->product, 1)->json('data.id');
    $this->actingAs($this->owner)->postJson("{$this->base}/orders/{$cancelled}/cancel", ['reason' => 'x'])->assertOk();

    $report = $this->actingAs($this->owner)->getJson("{$this->base}/reports/sales")->assertOk()->json('data');
    $row = $report['products'][0];

    expect($row['bought_qty'])->toBe(10)
        ->and($row['bought_cost'])->toBe('12000.00')
        ->and($row['sold']['shop'])->toBe(['qty' => 2, 'revenue' => '4000.00'])
        ->and($row['sold']['gloma'])->toBe(['qty' => 1, 'revenue' => '1900.00'])
        ->and($row['cogs'])->toBe('3600.00')
        ->and($row['returned_qty'])->toBe(1)
        ->and($row['in_stock'])->toBe(7);

    // 5900 revenue − 3600 COGS + 350 delivery fee − (350 + 350) courier − 150 return = 1800
    expect($report['totals'])->toMatchArray([
        'items_revenue' => '5900.00',
        'net_revenue' => '5900.00',
        'cost_of_goods_sold' => '3600.00',
        'delivery_fees_collected' => '350.00',
        'courier_charges' => '700.00',
        'return_charges' => '150.00',
        'gross_profit' => '1800.00',
    ]);

    $dash = $this->actingAs($this->owner)->getJson("{$this->base}/dashboard")->assertOk()->json('data');
    expect($dash['stock']['units'])->toBe(7)
        ->and($dash['stock']['value'])->toBe('8400.00')
        ->and($dash['sales']['shop']['revenue'])->toBe('4000.00')
        ->and($dash['sales']['gloma']['orders'])->toBe(1)
        ->and($dash['investment']['spent_on_stock'])->toBe('12000.00')
        ->and($dash['returns'])->toBe(1)
        ->and($dash['open_orders']['awaiting_confirmation'])->toBe(0);
});

it('shows COD outstanding for delivered unpaid orders', function () {
    $id = placeOrder($this->owner, $this->shop, $this->product, 1)->json('data.id');
    advance($this->owner, $this->shop, $id, 'deliver');
    $this->actingAs($this->owner)->getJson("{$this->base}/dashboard")
        ->assertJsonPath('data.cod_outstanding.shop', ['orders' => 1, 'amount' => '2350.00']);
});

it('lets admin add manual ledger entries with the right sign; owners cannot', function () {
    $post = fn (array $b) => $this->actingAs($this->admin)->postJson("{$this->base}/ledger", $b);

    $post(['type' => 'shop_payment', 'amount' => '50000', 'description' => 'Initial investment'])->assertCreated()
        ->assertJsonPath('data.amount', '50000.00')->assertJsonPath('data.party.value', 'gloma')->assertJsonPath('data.direction', 'in');
    $post(['type' => 'payout', 'amount' => '1000', 'description' => 'Paid to shop'])->assertCreated()->assertJsonPath('data.amount', '-1000.00');
    $post(['type' => 'payout', 'amount' => '-5', 'description' => 'x'])->assertStatus(422)->assertJsonPath('code', 'invalid_amount');
    $post(['type' => 'adjustment', 'amount' => '-20', 'description' => 'Rounding'])->assertStatus(422)->assertJsonPath('code', 'party_required');
    $post(['type' => 'adjustment', 'amount' => '-20', 'party' => 'shop', 'description' => 'Rounding'])->assertCreated()->assertJsonPath('data.amount', '-20.00');
    $post(['type' => 'order_payment', 'amount' => '1', 'description' => 'x'])->assertStatus(422);

    $this->actingAs($this->owner)->postJson("{$this->base}/ledger", ['type' => 'payout', 'amount' => '1', 'description' => 'x'])->assertForbidden();

    $this->actingAs($this->owner)->getJson("{$this->base}/ledger")->assertOk()
        ->assertJsonPath('summary.balances.gloma', '37000.00') // 50000 − 12000 purchase − 1000 payout
        ->assertJsonPath('summary.balances.shop', '-20.00');
    $this->actingAs($this->owner)->getJson("{$this->base}/dashboard")->assertJsonPath('data.investment.unspent', '38000.00');
});

it('never exposes "expected" or forecast figures (CBSL rule)', function () {
    $json = json_encode([
        $this->actingAs($this->owner)->getJson("{$this->base}/dashboard")->json(),
        $this->actingAs($this->owner)->getJson("{$this->base}/reports/sales")->json(),
    ]);
    expect(strtolower($json))->not->toContain('expected')->not->toContain('forecast')->not->toContain('projected')->not->toContain('guarantee');
});
