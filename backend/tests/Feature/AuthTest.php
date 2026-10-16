<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('logs in, returns me with shops, and logs out', function () {
    $shop = shop(['name' => 'Alpha']);
    $owner = ownerOf($shop);

    $this->postJson('/api/v1/auth/login', ['email' => $owner->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.user.email', $owner->email)
        ->assertJsonPath('data.is_admin', false)
        ->assertJsonPath('data.shops.0.name', 'Alpha')
        ->assertJsonPath('data.user.role.value', 'shop_owner');

    $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.shops.0.can_open', true);
    $this->postJson('/api/v1/auth/logout')->assertOk();
});

it('rejects wrong passwords and inactive users', function () {
    $user = User::factory()->owner()->create(['is_active' => false]);

    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])->assertStatus(422)->assertJsonValidationErrors('email');
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->assertStatus(422);
});

it('throttles login attempts to 5 per minute', function () {
    foreach (range(1, 5) as $i) {
        $this->postJson('/api/v1/auth/login', ['email' => 'x@y.lk', 'password' => 'bad'])->assertStatus(422);
    }
    $this->postJson('/api/v1/auth/login', ['email' => 'x@y.lk', 'password' => 'bad'])
        ->assertStatus(429)->assertJsonPath('code', 'too_many_attempts');
});

it('returns 401 JSON for guests', function () {
    $this->getJson('/api/v1/auth/me')->assertStatus(401)->assertJsonPath('message', 'Please log in.');
});

it('admin sees every shop and all permissions', function () {
    shop();
    shop();
    $this->actingAs(admin())->getJson('/api/v1/auth/me')
        ->assertOk()->assertJsonPath('data.is_admin', true)->assertJsonCount(2, 'data.shops')
        ->assertJsonFragment(['stock.manage']);
});

it('changes own password', function () {
    $user = User::factory()->owner()->create();
    $this->actingAs($user)->postJson('/api/v1/auth/password', [
        'current_password' => 'password', 'password' => 'new-secret-1', 'password_confirmation' => 'new-secret-1',
    ])->assertOk();
    expect(Hash::check('new-secret-1', $user->fresh()->password))->toBeTrue();
});
