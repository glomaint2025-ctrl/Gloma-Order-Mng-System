<?php

use App\Domain\Notifications\Jobs\SendMessage;
use App\Domain\Notifications\Mail\OrderMessageMail;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Notifications\Models\MessageTemplate;
use App\Domain\Orders\Models\Order;
use App\Support\Money;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $this->shop = shop(['name' => 'Alpha Store']);
    $this->owner = ownerOf($this->shop);
    $this->product = stockedProduct($this->shop, 20);
    $this->base = "/api/v1/shops/{$this->shop->id}";
});

describe('customers and warnings', function () {
    it('looks up a phone: unknown, then known with prefill data', function () {
        $this->actingAs($this->owner)->getJson("{$this->base}/customers/lookup?phone=0771234567")
            ->assertOk()->assertJsonPath('data.customer', null)->assertJsonPath('data.warnings', [])
            ->assertJsonPath('data.phone', '+94771234567');

        placeOrder($this->owner, $this->shop, $this->product);
        $this->actingAs($this->owner)->getJson("{$this->base}/customers/lookup?phone=+94 77 123 4567")
            ->assertJsonPath('data.customer.name', 'Kamal Perera')
            ->assertJsonPath('data.customer.address', '10 Temple Road')
            ->assertJsonPath('data.customer.orders_count', 1);

        $this->actingAs($this->owner)->getJson("{$this->base}/customers/lookup?phone=123")->assertStatus(422)->assertJsonPath('code', 'invalid_phone');
    });

    it('flags a risky customer: warning shows on the order but never blocks', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        $customerId = $this->actingAs($this->owner)->getJson("{$this->base}/orders/{$id}")->json('data.customer.id');

        $this->actingAs($this->owner)->patchJson("{$this->base}/customers/{$customerId}", ['is_risky' => true, 'risk_note' => 'Fake address twice'])
            ->assertOk()->assertJsonPath('data.warnings.0.code', 'flagged_risky');

        placeOrder($this->owner, $this->shop, $this->product)->assertCreated()
            ->assertJsonPath('data.warnings.0.message', 'Flagged as risky: Fake address twice');
        $this->actingAs($this->owner)->getJson("{$this->base}/orders")->assertJsonPath('data.0.has_warning', true);
        $this->actingAs($this->owner)->getJson("{$this->base}/customers?with_warning=1")->assertJsonCount(1, 'data');
    });

    it('keeps return history per shop; only Gloma admin sees other shops', function () {
        $other = shop();
        $otherOwner = ownerOf($other);
        $otherProduct = stockedProduct($other, 5);
        $id = placeOrder($otherOwner, $other, $otherProduct)->json('data.id');
        advance($otherOwner, $other, $id, 'dispatch');
        $this->actingAs($otherOwner)->postJson("/api/v1/shops/{$other->id}/orders/{$id}/return", ['reason' => 'Refused'])->assertOk();

        placeOrder($this->owner, $this->shop, $this->product);
        $this->actingAs($this->owner)->getJson("{$this->base}/customers/lookup?phone=0771234567")->assertJsonPath('data.warnings', []);
        $this->actingAs(admin())->getJson("{$this->base}/customers/lookup?phone=0771234567")
            ->assertJsonPath('data.warnings.0.code', 'returned_other_shops');
    });

    it('shows a customer with recent orders', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        $cid = $this->actingAs($this->owner)->getJson("{$this->base}/orders/{$id}")->json('data.customer.id');
        $this->actingAs($this->owner)->getJson("{$this->base}/customers/{$cid}")->assertOk()
            ->assertJsonPath('data.customer.phone_local', '0771234567')
            ->assertJsonCount(1, 'data.recent_orders');
    });
});

describe('notifications', function () {
    it('sends dispatch SMS through Text.lk with the right payload', function () {
        config(['portal.sms.driver' => 'textlk', 'portal.sms.textlk.token' => 'test-token', 'portal.sms.textlk.sender_id' => 'GLOMA']);
        Http::fake(['app.text.lk/*' => Http::response(['status' => 'success', 'data' => ['uid' => 'abc123']])]);

        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');

        Http::assertSent(fn ($r) => $r->url() === 'https://app.text.lk/api/v3/sms/send'
            && $r['recipient'] === '94771234567' && $r['sender_id'] === 'GLOMA'
            && str_contains($r['message'], 'Alpha Store') && $r->hasHeader('Authorization', 'Bearer test-token'));
        expect(MessageLog::withoutGlobalScopes()->where('channel', 'sms')->sole()->provider_ref)->toBe('abc123');
    });

    it('marks the SMS failed after a provider error and never breaks the order', function () {
        config(['portal.sms.driver' => 'textlk', 'portal.sms.textlk.token' => 't', 'portal.sms.textlk.sender_id' => 'G']);
        Http::fake(['app.text.lk/*' => Http::response(['status' => 'error', 'message' => 'Low balance'], 400)]);

        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch')->assertJsonPath('data.status.value', 'dispatched');

        $log = MessageLog::withoutGlobalScopes()->where('channel', 'sms')->sole();
        expect($log->status)->toBeIn(['queued', 'failed'])->and($log->error)->toContain('Low balance');

        (new SendMessage($log->id))->failed(new RuntimeException('Low balance'));
        expect($log->fresh()->status)->toBe('failed');
    });

    it('sends dispatch SMS through Dialog eSMS with the right query', function () {
        config(['portal.sms.driver' => 'dialog', 'portal.sms.dialog.api_key' => 'test-key', 'portal.sms.dialog.sender_id' => 'Gloma']);
        Http::fake(['e-sms.dialog.lk/*' => Http::response('1|98765')]);

        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');

        Http::assertSent(fn ($r) => str_starts_with($r->url(), 'https://e-sms.dialog.lk/api/v1/message-via-url/create/url-campaign?')
            && $r['esmsqk'] === 'test-key' && $r['list'] === '94771234567' && $r['source_address'] === 'Gloma'
            && str_contains($r['message'], 'Alpha Store'));
        expect(MessageLog::withoutGlobalScopes()->where('channel', 'sms')->sole()->provider_ref)->toBe('98765');
    });

    it('records the Dialog eSMS error code as a readable reason', function () {
        config(['portal.sms.driver' => 'dialog', 'portal.sms.dialog.api_key' => 'k', 'portal.sms.dialog.sender_id' => 'G']);
        Http::fake(['e-sms.dialog.lk/*' => Http::response('2008')]);

        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch')->assertJsonPath('data.status.value', 'dispatched');

        expect(MessageLog::withoutGlobalScopes()->where('channel', 'sms')->sole()->error)->toContain('insufficient account balance');
    });

    it('sends the e-bill email with the invoice PDF attached', function () {
        Mail::fake();
        placeOrder($this->owner, $this->shop, $this->product)->assertCreated();

        Mail::assertSent(OrderMessageMail::class, function ($mail) {
            return $mail->hasTo('kamal@example.com')
                && $mail->envelope()->subject === 'Your order '.Order::withoutGlobalScopes()->value('number').' from Alpha Store'
                && count($mail->attachments()) === 1;
        });
    });

    it('uses the shop template override, costs Sinhala at Unicode rates, and can reset', function () {
        $sinhala = '{shop_name}: ඔබගේ ඇණවුම {order_number} යවා ඇත. {tracking_url} මගින් බලන්න. ස්තූතියි! ඔබගේ ඇණවුම යවා ඇත.';
        $this->actingAs($this->owner)->putJson("{$this->base}/templates", ['event' => 'order_dispatched', 'channel' => 'sms', 'body' => $sinhala])
            ->assertOk()->assertJsonPath('data.scope', 'shop');
        $this->actingAs($this->owner)->getJson("{$this->base}/templates")->assertOk()
            ->assertJsonPath('data.1.uses', 'shop')->assertJsonPath('data.0.uses', 'global');

        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');
        $sms = MessageLog::withoutGlobalScopes()->where('channel', 'sms')->sole();
        expect($sms->body)->toContain('ඔබගේ')->and($sms->segments)->toBeGreaterThan(1)
            ->and($sms->cost)->toBe(Money::mul('0.64', $sms->segments));

        $this->actingAs($this->owner)->deleteJson("{$this->base}/templates", ['event' => 'order_dispatched', 'channel' => 'sms'])->assertOk();
        expect(MessageTemplate::query()->whereNotNull('shop_id')->count())->toBe(0);
    });

    it('reports SMS usage per shop and per month', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');

        $this->actingAs($this->owner)->getJson("{$this->base}/messages?channel=sms")->assertOk()
            ->assertJsonPath('summary.sms_sent', 1)->assertJsonPath('summary.sms_cost', '0.64');
        $this->actingAs(admin())->getJson('/api/v1/admin/sms-usage')->assertOk()
            ->assertJsonPath('data.shops.0.sent', 1)->assertJsonPath('data.total_cost', '0.64');
    });
});
