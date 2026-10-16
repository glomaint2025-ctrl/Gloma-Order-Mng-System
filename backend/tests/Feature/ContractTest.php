<?php

/*
| Contract tests: the JSON shape the frontend builds on (docs/API.md). Changing these = contract change (CLAUDE.md).
*/

beforeEach(function () {
    $this->shop = shop();
    $this->owner = ownerOf($this->shop);
    $this->product = stockedProduct($this->shop, 5);
});

it('keeps the order resource shape', function () {
    placeOrder($this->owner, $this->shop, $this->product)->assertCreated()->assertJsonStructure(['data' => [
        'id', 'number', 'version',
        'channel' => ['value', 'label'], 'seller' => ['value', 'label'],
        'status' => ['value', 'label', 'tone'], 'payment_status' => ['value', 'label', 'tone'],
        'available_actions', 'warnings', 'placed_by' => ['id', 'name'],
        'customer' => ['id', 'name', 'phone', 'phone_local', 'email', 'address', 'city'],
        'items' => [['id', 'product_id', 'sku', 'name', 'location' => ['value', 'label'], 'qty', 'unit_price', 'line_total', 'returned_good_qty', 'returned_damaged_qty']],
        'payment_method' => ['id', 'name', 'kind' => ['value', 'label'], 'requires_slip'],
        'totals' => ['subtotal', 'discount', 'delivery_fee', 'total'],
        'shipping' => ['courier', 'courier_account', 'tracking_number', 'tracking_url', 'courier_charge'],
        'cancel_reason', 'return_reason', 'return_charge', 'payments', 'timeline' => [['id', 'type', 'label', 'to_status', 'meta', 'user', 'created_at']],
        'notes', 'dates' => ['created_at', 'confirmed_at', 'packed_at', 'dispatched_at', 'delivered_at', 'returned_at', 'cancelled_at', 'paid_at'],
    ]]);
});

it('keeps money as 2-decimal strings', function () {
    $data = placeOrder($this->owner, $this->shop, $this->product)->json('data');
    foreach ($data['totals'] as $value) {
        expect($value)->toBeString()->toMatch('/^-?\d+\.\d{2}$/');
    }
});

it('keeps list, product and meta shapes', function () {
    placeOrder($this->owner, $this->shop, $this->product);
    $base = "/api/v1/shops/{$this->shop->id}";

    $this->actingAs($this->owner)->getJson("{$base}/orders")->assertJsonStructure([
        'data' => [['id', 'number', 'channel', 'seller', 'status' => ['value', 'label', 'tone'], 'payment_status', 'customer_name', 'customer_phone_local', 'delivery_city', 'items_count', 'total', 'tracking_number', 'has_warning', 'created_at']],
        'links', 'meta' => ['current_page', 'last_page', 'per_page', 'total'],
    ]);
    $this->actingAs($this->owner)->getJson("{$base}/products")->assertJsonStructure([
        'data' => [['id', 'sku', 'name', 'description', 'price', 'avg_cost', 'is_active', 'stock' => ['total', 'by_location' => [['location' => ['value', 'label'], 'qty']]]]],
    ]);
    $this->actingAs($this->owner)->getJson('/api/v1/meta')->assertJsonStructure(['data' => [
        'order_statuses', 'payment_statuses', 'order_channels', 'parties', 'stock_locations', 'stock_modes', 'shop_statuses',
        'movement_types', 'manual_adjustment_types', 'ledger_types', 'manual_ledger_types', 'payment_method_kinds',
        'message_events', 'message_channels', 'template_placeholders', 'couriers', 'currency', 'timezone',
    ]])->assertJsonPath('data.currency', 'LKR')->assertJsonPath('data.timezone', 'Asia/Colombo');
});

it('returns errors in the agreed shapes', function () {
    $base = "/api/v1/shops/{$this->shop->id}";
    $this->actingAs($this->owner)->postJson("{$base}/orders", [])->assertStatus(422)->assertJsonStructure(['message', 'errors']);
    $this->actingAs($this->owner)->getJson("{$base}/orders/999999")->assertNotFound()->assertJsonStructure(['message']);
    $this->actingAs($this->owner)->postJson("{$base}/products", [])->assertForbidden()->assertJsonStructure(['message']);
    placeOrder($this->owner, $this->shop, $this->product, 99)->assertStatus(409)->assertJsonStructure(['message', 'code']);
});

it('serves invoice and label PDFs, single and bulk', function () {
    $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
    $base = "/api/v1/shops/{$this->shop->id}/orders";

    $this->actingAs($this->owner)->get("{$base}/{$id}/invoice.pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');
    $this->actingAs($this->owner)->get("{$base}/{$id}/label.pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');
    $this->actingAs($this->owner)->post("{$base}/print", ['type' => 'label', 'order_ids' => [$id]])->assertOk()->assertHeader('Content-Type', 'application/pdf');
});

it('reports health', function () {
    $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('status', 'ok')->assertJsonPath('database', true)
        ->assertJsonStructure(['queue' => ['pending', 'failed'], 'cron_last_run', 'version', 'time']);
});
