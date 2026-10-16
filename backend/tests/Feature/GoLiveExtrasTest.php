<?php

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Customers\Models\Customer;
use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderNote;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

/*
| Pre-go-live additions: forgot password, CSV exports, sales trend, product images, PDPA export/erase.
*/

beforeEach(function () {
    $this->shop = shop(['code' => 'ALPHA']);
    $this->owner = ownerOf($this->shop);
    $this->admin = admin();
    $this->product = stockedProduct($this->shop, 20, ['price' => '2000.00', 'avg_cost' => '1000.00']);
    $this->base = "/api/v1/shops/{$this->shop->id}";
});

describe('forgot password', function () {
    it('emails a reset link to the SPA and resets the password with it', function () {
        Notification::fake();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => strtoupper($this->owner->email)])->assertOk();

        $token = null;
        Notification::assertSentTo($this->owner, ResetPassword::class, function (ResetPassword $n) use (&$token) {
            $token = $n->token;
            $url = $n->toMail($this->owner)->actionUrl;

            return str_contains($url, '/reset-password?token=') && str_contains($url, 'email=');
        });

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token, 'email' => $this->owner->email, 'password' => 'brand-new-1', 'password_confirmation' => 'brand-new-1',
        ])->assertOk();
        expect(Hash::check('brand-new-1', $this->owner->fresh()->password))->toBeTrue();

        // The token is single-use.
        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token, 'email' => $this->owner->email, 'password' => 'again-new-1', 'password_confirmation' => 'again-new-1',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    });

    it('gives the same answer for unknown and inactive emails (no account probing)', function () {
        Notification::fake();
        $inactive = User::factory()->owner()->create(['is_active' => false]);
        $a = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json('message');
        $b = $this->postJson('/api/v1/auth/forgot-password', ['email' => $inactive->email])->assertOk()->json('message');
        expect($a)->toBe($b);
        Notification::assertNothingSent();
    });

    it('rejects a wrong token', function () {
        $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'nope', 'email' => $this->owner->email, 'password' => 'brand-new-1', 'password_confirmation' => 'brand-new-1',
        ])->assertStatus(422);
    });
});

describe('CSV exports', function () {
    it('exports orders with the list filters, Excel-friendly and injection-safe', function () {
        placeOrder($this->owner, $this->shop, $this->product, 2, ['customer' => ['name' => '=HYPERLINK("x")', 'phone' => '0771234567']]);
        placeOrder($this->admin, $this->shop, $this->product, 1, ['customer' => ['name' => 'කමල් පෙරේරා', 'phone' => '0712222222']]);

        $res = $this->actingAs($this->owner)->get("{$this->base}/orders/export?seller=shop")->assertOk();
        expect($res->headers->get('content-type'))->toContain('text/csv');
        $csv = $res->streamedContent();

        expect($csv)->toStartWith("\xEF\xBB\xBF")
            ->toContain('ALPHA-000001')->not->toContain('ALPHA-000002')
            ->toContain("'=HYPERLINK")
            ->toContain('4350.00');

        $all = $this->actingAs($this->owner)->get("{$this->base}/orders/export")->streamedContent();
        expect($all)->toContain('කමල් පෙරේරා');
    });

    it('exports the ledger with running balances and the sales report', function () {
        $this->actingAs($this->admin)->postJson("{$this->base}/ledger", ['type' => 'shop_payment', 'amount' => '5000', 'description' => 'Investment'])->assertCreated();
        $this->actingAs($this->admin)->postJson("{$this->base}/ledger", ['type' => 'payout', 'amount' => '1200', 'description' => 'Payout'])->assertCreated();

        $ledger = $this->actingAs($this->owner)->get("{$this->base}/ledger/export")->assertOk()->streamedContent();
        expect($ledger)->toContain('Running balance')->toContain('5000.00')->toContain('-1200.00')->toContain('3800.00');

        $id = placeOrder($this->owner, $this->shop, $this->product, 1)->json('data.id');
        advance($this->owner, $this->shop, $id, 'deliver');
        $report = $this->actingAs($this->owner)->get("{$this->base}/reports/sales/export")->assertOk()->streamedContent();
        expect($report)->toContain($this->product->sku)->toContain('Gross profit')->toContain('TOTAL');
    });

    it('keeps exports tenant-scoped', function () {
        $other = shop();
        $otherOwner = ownerOf($other);
        placeOrder($this->owner, $this->shop, $this->product);
        $csv = $this->actingAs($otherOwner)->get("/api/v1/shops/{$other->id}/orders/export")->assertOk()->streamedContent();
        expect($csv)->not->toContain('ALPHA-');
        $this->actingAs($otherOwner)->get("{$this->base}/orders/export")->assertNotFound();
    });
});

describe('sales trend', function () {
    it('returns one bucket per day with zeros, split by seller', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product, 1)->json('data.id');
        advance($this->owner, $this->shop, $id, 'deliver');
        $this->actingAs($this->admin)->postJson("{$this->base}/orders", [
            'channel' => 'walk_in', 'payment_method_id' => codMethod($this->shop)->id,
            'items' => [['product_id' => $this->product->id, 'qty' => 2]],
        ])->assertCreated();

        $from = now()->subDays(6)->toDateString();
        $to = now()->toDateString();
        $trend = $this->actingAs($this->owner)->getJson("{$this->base}/dashboard?from={$from}&to={$to}")->json('data.trend');

        expect($trend['bucket'])->toBe('day')->and($trend['points'])->toHaveCount(7);
        $today = collect($trend['points'])->firstWhere('date', $to);
        expect($today)->toBe(['date' => $to, 'orders' => 2, 'gloma' => '4000.00', 'shop' => '2000.00', 'total' => '6000.00'])
            ->and($trend['points'][0]['total'])->toBe('0.00');
    });

    it('switches to monthly buckets for long ranges', function () {
        $trend = $this->actingAs($this->owner)->getJson("{$this->base}/dashboard?from=2026-01-01&to=2026-10-16")->json('data.trend');
        expect($trend['bucket'])->toBe('month')->and($trend['points'])->toHaveCount(10)
            ->and($trend['points'][0]['date'])->toBe('2026-01');
    });
});

describe('product images', function () {
    it('lets admin upload, replace and remove an image; owners cannot', function () {
        Storage::fake('public');
        $url = "{$this->base}/products/{$this->product->id}/image";

        $this->actingAs($this->owner)->post($url, ['image' => UploadedFile::fake()->image('a.jpg')], ['Accept' => 'application/json'])->assertForbidden();

        $first = $this->actingAs($this->admin)->post($url, ['image' => UploadedFile::fake()->image('a.jpg', 400, 400)], ['Accept' => 'application/json'])
            ->assertOk()->json('data.image_url');
        expect($first)->toContain('/storage/products/');
        $firstPath = $this->product->fresh()->image_path;
        Storage::disk('public')->assertExists($firstPath);

        $this->actingAs($this->admin)->post($url, ['image' => UploadedFile::fake()->image('b.png')], ['Accept' => 'application/json'])->assertOk();
        Storage::disk('public')->assertMissing($firstPath);

        $this->actingAs($this->admin)->post($url, ['image' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('image');

        $this->actingAs($this->admin)->deleteJson($url)->assertOk()->assertJsonPath('data.image_url', null);
    });
});

describe('PDPA customer requests', function () {
    it('exports everything held about a customer (admin only)', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product, 1, ['note' => 'Call after 5pm'])->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');
        $customer = Customer::withoutGlobalScopes()->sole();

        $this->actingAs($this->owner)->getJson("{$this->base}/customers/{$customer->id}/export")->assertForbidden();
        $this->actingAs($this->admin)->getJson("{$this->base}/customers/{$customer->id}/export")->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="customer-'.$customer->id.'-data.json"')
            ->assertJsonPath('customer.phone', '+94771234567')
            ->assertJsonPath('orders.0.number', 'ALPHA-000001')
            ->assertJsonPath('orders.0.notes.0', 'Call after 5pm')
            ->assertJsonStructure(['generated_at', 'controller', 'customer', 'orders', 'messages_sent' => [['channel', 'recipient', 'body']]]);
    });

    it('erases a customer but keeps the money records', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product, 1, ['note' => 'Gate code 1234'])->json('data.id');
        advance($this->owner, $this->shop, $id, 'deliver');
        $this->actingAs($this->owner)->postJson("{$this->base}/orders/{$id}/payments")->assertOk();
        $customer = Customer::withoutGlobalScopes()->sole();
        $url = "{$this->base}/customers/{$customer->id}/erase";

        $this->actingAs($this->owner)->postJson($url, ['confirm' => 'ERASE', 'reason' => 'x'])->assertForbidden();
        $this->actingAs($this->admin)->postJson($url, ['reason' => 'Customer request'])->assertStatus(422)->assertJsonValidationErrors('confirm');
        $this->actingAs($this->admin)->postJson($url, ['confirm' => 'ERASE', 'reason' => 'Customer request by email 2026-10-17'])->assertOk();

        $order = Order::withoutGlobalScopes()->find($id);
        expect($order->customer_name)->toBe('Removed')->and($order->customer_phone)->toBeNull()->and($order->delivery_address)->toBeNull()
            ->and($order->total)->toBe('2350.00')
            ->and($customer->fresh()->anonymized_at)->not->toBeNull()
            ->and(MessageLog::withoutGlobalScopes()->where('body', 'like', '%Kamal%')->exists())->toBeFalse()
            ->and(OrderNote::query()->value('body'))->toBe('[removed for privacy]')
            ->and(LedgerEntry::withoutGlobalScopes()->where('order_id', $id)->where('type', 'order_payment')->value('amount'))->toBe('2350.00')
            ->and(AuditLog::query()->where('action', 'customer.erased')->exists())->toBeTrue();

        // Gone from lists and lookups; erasing twice is refused.
        $this->actingAs($this->owner)->getJson("{$this->base}/customers")->assertJsonCount(0, 'data');
        $this->actingAs($this->owner)->getJson("{$this->base}/customers/lookup?phone=0771234567")->assertJsonPath('data.customer', null);
        $this->actingAs($this->admin)->postJson($url, ['confirm' => 'ERASE', 'reason' => 'again'])->assertStatus(409)->assertJsonPath('code', 'already_erased');
    });

    it('the retention job uses the same erase', function () {
        placeOrder($this->owner, $this->shop, $this->product);
        $customer = Customer::withoutGlobalScopes()->sole();
        Order::withoutGlobalScopes()->update(['created_at' => now()->subYears(6)]);
        Customer::withoutGlobalScopes()->update(['updated_at' => now()->subYears(6)]);

        $this->artisan('portal:anonymize-customers')->assertSuccessful();
        expect($customer->fresh()->anonymized_at)->not->toBeNull()
            ->and(Order::withoutGlobalScopes()->value('delivery_city'))->toBeNull();
    });
});
