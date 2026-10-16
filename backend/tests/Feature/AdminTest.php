<?php

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Couriers\Models\Courier;
use App\Models\User;

beforeEach(function () {
    $this->admin = admin();
});

it('creates a shop with a new owner login and default payment methods', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/admin/shops', [
        'name' => 'Beta Shop', 'code' => 'beta', 'contract_ref' => 'GL-9',
        'owner' => ['name' => 'Ruwan', 'email' => 'ruwan@example.com', 'password' => 'secret-123'],
    ])->assertCreated()
        ->assertJsonPath('data.code', 'BETA')
        ->assertJsonPath('data.stock_mode.value', 'single')
        ->assertJsonPath('data.owners.0.email', 'ruwan@example.com');

    $owner = User::query()->where('email', 'ruwan@example.com')->firstOrFail();
    expect($owner->hasRole('shop_owner'))->toBeTrue();

    $shopId = $this->actingAs($owner)->getJson('/api/v1/auth/me')->json('data.shops.0.id');
    $this->actingAs($owner)->getJson("/api/v1/shops/{$shopId}/payment-methods")->assertOk()->assertJsonCount(3, 'data');
    expect(AuditLog::query()->where('action', 'shop.created')->exists())->toBeTrue();
});

it('lets one owner hold several shops and attach an existing owner', function () {
    $shop1 = shop();
    $owner = ownerOf($shop1);
    $this->actingAs($this->admin)->postJson('/api/v1/admin/shops', ['name' => 'Second', 'code' => 'SEC', 'owner' => ['user_id' => $owner->id]])->assertCreated();
    $this->actingAs($owner)->getJson('/api/v1/auth/me')->assertJsonCount(2, 'data.shops');

    $this->actingAs($this->admin)->postJson('/api/v1/admin/shops', ['name' => 'Bad', 'code' => 'BAD', 'owner' => ['user_id' => $this->admin->id]])
        ->assertStatus(422)->assertJsonPath('code', 'invalid_owner');
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/shops/{$shop1->id}/owners/{$owner->id}")->assertStatus(409)->assertJsonPath('code', 'last_owner');
});

it('blocks shop owners from every admin endpoint', function () {
    $owner = ownerOf(shop());
    foreach (['/api/v1/admin/shops', '/api/v1/admin/users', '/api/v1/admin/dashboard', '/api/v1/admin/audit-logs', '/api/v1/admin/couriers'] as $url) {
        $this->actingAs($owner)->getJson($url)->assertForbidden();
    }
});

it('suspends, closes and reactivates a shop', function () {
    $shop = shop();
    $this->actingAs($this->admin)->postJson("/api/v1/admin/shops/{$shop->id}/status", ['status' => 'suspended'])->assertOk()->assertJsonPath('data.status.value', 'suspended');
    $this->actingAs($this->admin)->postJson("/api/v1/admin/shops/{$shop->id}/status", ['status' => 'closed'])->assertOk()->assertJsonPath('data.is_read_only', true);
    $this->actingAs($this->admin)->postJson("/api/v1/admin/shops/{$shop->id}/status", ['status' => 'active'])->assertOk();
});

it('manages users: create admin, reset password, deactivate (not self)', function () {
    $res = $this->actingAs($this->admin)->postJson('/api/v1/admin/users', ['name' => 'Ops', 'email' => 'ops@gloma.lk', 'password' => 'secret-123', 'role' => 'gloma_admin'])
        ->assertCreated()->assertJsonPath('data.role.value', 'gloma_admin');
    $id = $res->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$id}", ['password' => 'another-123', 'is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
    $this->postJson('/api/v1/auth/login', ['email' => 'ops@gloma.lk', 'password' => 'another-123'])->assertStatus(422);

    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$this->admin->id}", ['is_active' => false])->assertStatus(422)->assertJsonPath('code', 'self_deactivate');
    $this->actingAs($this->admin)->getJson('/api/v1/admin/users?role=gloma_admin')->assertOk()->assertJsonCount(2, 'data');
});

it('edits a courier tracking pattern (must contain {tracking}) and Gloma courier accounts', function () {
    $courier = Courier::query()->where('code', 'royal')->firstOrFail();
    $this->actingAs($this->admin)->patchJson("/api/v1/admin/couriers/{$courier->id}", ['tracking_url_template' => 'https://royal.lk/t'])->assertStatus(422);
    $this->actingAs($this->admin)->patchJson("/api/v1/admin/couriers/{$courier->id}", ['tracking_url_template' => 'https://royal.lk/t/{tracking}'])->assertOk();

    $this->actingAs($this->admin)->postJson('/api/v1/admin/courier-accounts', ['courier_id' => $courier->id, 'label' => 'Gloma Royal', 'default_charge' => '450'])
        ->assertCreated()->assertJsonPath('data.owner.value', 'gloma');
    $this->actingAs($this->admin)->getJson('/api/v1/admin/courier-accounts')->assertJsonCount(1, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/meta')->assertJsonFragment(['tracking_url_template' => 'https://royal.lk/t/{tracking}']);
});

it('edits global templates and shows the audit log', function () {
    $this->actingAs($this->admin)->putJson('/api/v1/admin/templates', ['event' => 'order_dispatched', 'channel' => 'sms', 'body' => 'Sent {order_number}'])
        ->assertOk()->assertJsonPath('data.sms_segments', 1);
    $this->actingAs($this->admin)->getJson('/api/v1/admin/templates')->assertJsonCount(3, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/admin/audit-logs?action=template')->assertOk()->assertJsonPath('data.0.action', 'template.saved');
});

it('shows the admin dashboard across shops', function () {
    $a = shop(['name' => 'A shop']);
    stockedProduct($a, 4, ['avg_cost' => '100.00']);
    shop(['name' => 'B shop']);
    $this->actingAs($this->admin)->getJson('/api/v1/admin/dashboard')->assertOk()
        ->assertJsonCount(2, 'data.shops')
        ->assertJsonPath('data.shops.0.stock_units', 4)
        ->assertJsonPath('data.totals.stock_value', '400.00');
});
