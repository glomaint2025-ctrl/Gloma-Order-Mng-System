<?php

use App\Domain\Finance\Models\LedgerEntry;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Notifications\Jobs\SendMessage;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Orders\Models\Order;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->shop = shop(['code' => 'ALPHA']);
    $this->owner = ownerOf($this->shop);
    $this->admin = admin();
    $this->product = stockedProduct($this->shop, 10, ['price' => '2500.00', 'avg_cost' => '1500.00']);
    $this->url = "/api/v1/shops/{$this->shop->id}/orders";
});

describe('placing orders', function () {
    it('places a delivery order: stock down, numbered, awaiting confirmation, totals right', function () {
        $res = placeOrder($this->owner, $this->shop, $this->product, 2, ['discount' => '500'])->assertCreated();

        $res->assertJsonPath('data.number', 'ALPHA-000001')
            ->assertJsonPath('data.status.value', 'awaiting_confirmation')
            ->assertJsonPath('data.status.tone', 'warning')
            ->assertJsonPath('data.payment_status.value', 'unpaid')
            ->assertJsonPath('data.seller.value', 'shop')
            ->assertJsonPath('data.customer.phone', '+94771234567')
            ->assertJsonPath('data.totals.subtotal', '5000.00')
            ->assertJsonPath('data.totals.discount', '500.00')
            ->assertJsonPath('data.totals.delivery_fee', '350.00')
            ->assertJsonPath('data.totals.total', '4850.00')
            ->assertJsonPath('data.available_actions', ['edit', 'confirm', 'cancel', 'record_payment', 'add_note', 'print_invoice', 'print_label']);

        expect(stockOf($this->product))->toBe(8);
        placeOrder($this->owner, $this->shop, $this->product)->assertJsonPath('data.number', 'ALPHA-000002');
    });

    it('queues the e-bill email when the customer has an email', function () {
        Queue::fake();
        placeOrder($this->owner, $this->shop, $this->product)->assertCreated();

        $log = MessageLog::withoutGlobalScopes()->sole();
        expect($log->channel->value)->toBe('email')->and($log->event->value)->toBe('order_placed')
            ->and($log->status)->toBe('queued')->and($log->body)->toContain('ALPHA-000001');
        Queue::assertPushed(SendMessage::class);
    });

    it('refuses to oversell and saves nothing', function () {
        $other = stockedProduct($this->shop, 1);
        $payload = orderPayload($this->shop, $this->product, 1);
        $payload['items'][] = ['product_id' => $other->id, 'qty' => 2];

        $this->actingAs($this->owner)->postJson($this->url, $payload)
            ->assertStatus(409)->assertJsonPath('code', 'insufficient_stock');

        expect(Order::withoutGlobalScopes()->count())->toBe(0)
            ->and(stockOf($this->product))->toBe(10)
            ->and(stockOf($other))->toBe(1);
    });

    it('sells exactly the last unit, then refuses (no backorders)', function () {
        $last = stockedProduct($this->shop, 1);
        placeOrder($this->owner, $this->shop, $last)->assertCreated();
        placeOrder($this->admin, $this->shop, $last)->assertStatus(409)->assertJsonPath('code', 'insufficient_stock');
        expect(stockOf($last))->toBe(0);
    });

    it('keeps the submitted price when the product price changes mid-flow', function () {
        $res = placeOrder($this->owner, $this->shop, $this->product, 1, ['items' => [['product_id' => $this->product->id, 'qty' => 1, 'unit_price' => '2200']]]);
        $this->product->update(['price' => '9999.00']);
        $this->actingAs($this->owner)->getJson("{$this->url}/{$res->json('data.id')}")->assertJsonPath('data.items.0.unit_price', '2200.00');
    });

    it('records a walk-in sale as completed and paid, with no delivery fee', function () {
        $res = $this->actingAs($this->owner)->postJson($this->url, [
            'channel' => 'walk_in',
            'payment_method_id' => codMethod($this->shop)->id,
            'items' => [['product_id' => $this->product->id, 'qty' => 3]],
            'delivery_fee' => '999',
        ])->assertCreated();

        $res->assertJsonPath('data.status.value', 'completed')
            ->assertJsonPath('data.payment_status.value', 'paid')
            ->assertJsonPath('data.totals.delivery_fee', '0.00')
            ->assertJsonPath('data.totals.total', '7500.00');
        expect(stockOf($this->product))->toBe(7)
            ->and(LedgerEntry::withoutGlobalScopes()->where('type', 'order_payment')->value('amount'))->toBe('7500.00')
            ->and(MessageLog::withoutGlobalScopes()->count())->toBe(0);
    });

    it('validates delivery orders need customer details and a valid phone', function () {
        $this->actingAs($this->owner)->postJson($this->url, ['payment_method_id' => codMethod($this->shop)->id, 'items' => [['product_id' => $this->product->id, 'qty' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors(['customer', 'customer.phone', 'customer.name']);
        placeOrder($this->owner, $this->shop, $this->product, 1, ['customer' => ['phone' => '12345']])
            ->assertStatus(422)->assertJsonPath('code', 'invalid_phone');
        placeOrder($this->owner, $this->shop, $this->product, 1, ['customer' => ['address' => '']])
            ->assertStatus(422)->assertJsonPath('code', 'customer_required');
    });

    it('rejects inactive products and another shop\'s payment method', function () {
        $this->product->update(['is_active' => false]);
        placeOrder($this->owner, $this->shop, $this->product)->assertStatus(422)->assertJsonPath('code', 'inactive_product');

        $active = stockedProduct($this->shop, 2);
        $foreign = codMethod(shop());
        placeOrder($this->owner, $this->shop, $active, 1, ['payment_method_id' => $foreign->id])
            ->assertStatus(422)->assertJsonPath('code', 'invalid_payment_method');
    });
});

describe('stock location by seller', function () {
    it('in single mode both sides sell from the shared pool', function () {
        placeOrder($this->admin, $this->shop, $this->product)->assertCreated()->assertJsonPath('data.seller.value', 'gloma')
            ->assertJsonPath('data.items.0.location.value', 'shared');
        placeOrder($this->owner, $this->shop, $this->product)->assertCreated();
        expect(stockOf($this->product, StockLocation::Shared))->toBe(8);
    });

    it('in by-location mode each side sells only what sits at its own place', function () {
        $shop = shop(['stock_mode' => 'by_location']);
        $owner = ownerOf($shop);
        $product = stockedProduct($shop, 0);
        app(\App\Domain\Inventory\Services\StockLedger::class)->move($product, StockLocation::Gloma, 2, \App\Domain\Inventory\Enums\MovementType::Correction, 't');

        placeOrder($owner, $shop, $product)->assertStatus(409)->assertJsonPath('code', 'insufficient_stock');
        placeOrder($this->admin, $shop, $product)->assertCreated()->assertJsonPath('data.items.0.location.value', 'gloma');
        expect(stockOf($product, StockLocation::Gloma))->toBe(1);
    });
});

describe('lifecycle', function () {
    it('runs confirm → pack → dispatch → deliver with payment, tracking link, SMS and ledger', function () {
        $account = shopCourierAccount($this->shop, 'koombiyo');
        $id = placeOrder($this->owner, $this->shop, $this->product, 2)->json('data.id');

        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/confirm")->assertOk()
            ->assertJsonPath('data.status.value', 'processing');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/pack")->assertOk()
            ->assertJsonPath('data.status.value', 'packed')
            ->assertJsonPath('data.available_actions', ['dispatch', 'cancel', 'record_payment', 'add_note', 'print_invoice', 'print_label']);

        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/dispatch", ['courier_account_id' => $account->id, 'tracking_number' => 'KB 123'])
            ->assertOk()
            ->assertJsonPath('data.status.value', 'dispatched')
            ->assertJsonPath('data.shipping.tracking_url', 'https://koombiyodelivery.lk/Track/track_id?id=KB%20123')
            ->assertJsonPath('data.shipping.courier_charge', '350.00');

        $sms = MessageLog::withoutGlobalScopes()->where('channel', 'sms')->sole();
        expect($sms->status)->toBe('sent')->and($sms->recipient)->toBe('+94771234567')
            ->and($sms->segments)->toBe(1)->and($sms->cost)->toBe('0.64')
            ->and($sms->body)->toContain('KB%20123');
        expect(MessageLog::withoutGlobalScopes()->where('channel', 'email')->count())->toBe(2);

        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/deliver", ['record_payment' => true])->assertOk()
            ->assertJsonPath('data.status.value', 'delivered')
            ->assertJsonPath('data.payment_status.value', 'paid');

        $ledger = LedgerEntry::withoutGlobalScopes()->where('order_id', $id)->get()->keyBy(fn ($e) => $e->type->value);
        expect($ledger['courier_charge']->amount)->toBe('-350.00')->and($ledger['courier_charge']->party->value)->toBe('shop')
            ->and($ledger['order_payment']->amount)->toBe('5350.00');

        $timeline = $this->actingAs($this->owner)->getJson("{$this->url}/{$id}")->json('data.timeline.*.type');
        expect($timeline)->toBe(['placed', 'confirmed', 'packed', 'dispatched', 'delivered', 'payment_recorded']);
    });

    it('refuses steps out of order with a clear 409', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/pack")->assertStatus(409)
            ->assertJsonPath('code', 'invalid_transition')->assertJsonPath('message', 'Confirm the order before packing.');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/deliver")->assertStatus(409);
    });

    it('lets the owner see but not run Gloma\'s orders', function () {
        $id = placeOrder($this->admin, $this->shop, $this->product)->json('data.id');
        $this->actingAs($this->owner)->getJson("{$this->url}/{$id}")->assertOk()
            ->assertJsonPath('data.available_actions', ['add_note', 'print_invoice', 'print_label']);
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/confirm")->assertForbidden()->assertJsonPath('code', 'not_your_order');
    });

    it('dispatches only with the seller\'s own courier account', function () {
        $gloma = glomaCourierAccount();
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'pack');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/dispatch", ['courier_account_id' => $gloma->id, 'tracking_number' => 'X1'])
            ->assertStatus(422)->assertJsonPath('code', 'invalid_courier_account');

        $gid = placeOrder($this->admin, $this->shop, $this->product)->json('data.id');
        advance($this->admin, $this->shop, $gid, 'dispatch');
        expect(Order::withoutGlobalScopes()->find($gid)->courier_account_id)->toBe($gloma->id);
        expect(LedgerEntry::withoutGlobalScopes()->where('order_id', $gid)->where('type', 'courier_charge')->value('party')->value)->toBe('gloma');
    });

    it('skips SMS to a landline but still dispatches', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product, 1, ['customer' => ['phone' => '0112345678', 'email' => null]])->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');
        expect(MessageLog::withoutGlobalScopes()->sole()->status)->toBe('skipped');
    });
});

describe('editing', function () {
    it('edits items, customer and fee with stock netted, and bumps version', function () {
        $res = placeOrder($this->owner, $this->shop, $this->product, 2);
        $id = $res->json('data.id');
        $other = stockedProduct($this->shop, 5);

        $payload = orderPayload($this->shop, $this->product, 1, [
            'version' => $res->json('data.version'),
            'customer' => ['phone' => '0719999999', 'name' => 'Nimal'],
            'delivery_fee' => '0',
        ]);
        $payload['items'] = [['product_id' => $this->product->id, 'qty' => 1], ['product_id' => $other->id, 'qty' => 2]];

        $this->actingAs($this->owner)->patchJson("{$this->url}/{$id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.customer.phone', '+94719999999')
            ->assertJsonPath('data.totals.total', '7500.00')
            ->assertJsonPath('data.version', 2);

        expect(stockOf($this->product))->toBe(9)->and(stockOf($other))->toBe(3)
            ->and(StockMovement::withoutGlobalScopes()->where('type', 'order_edit')->count())->toBe(2);
    });

    it('rejects a stale version (two people editing)', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/confirm")->assertOk(); // version is now 2

        $this->actingAs($this->owner)->patchJson("{$this->url}/{$id}", orderPayload($this->shop, $this->product, 3) + ['version' => 1])
            ->assertStatus(409)->assertJsonPath('code', 'stale_version');
        expect(stockOf($this->product))->toBe(9);
    });

    it('cannot edit once packed', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        $version = advance($this->owner, $this->shop, $id, 'pack')->json('data.version');
        $this->actingAs($this->owner)->patchJson("{$this->url}/{$id}", orderPayload($this->shop, $this->product, 2) + ['version' => $version])
            ->assertStatus(409)->assertJsonPath('code', 'invalid_transition');
    });
});

describe('cancel, return, refund', function () {
    it('cancels with a reason and returns stock', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product, 4)->json('data.id');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/cancel")->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/cancel", ['reason' => 'Customer changed mind'])->assertOk()
            ->assertJsonPath('data.status.value', 'cancelled')->assertJsonPath('data.cancel_reason', 'Customer changed mind');
        expect(stockOf($this->product))->toBe(10);
    });

    it('cannot cancel after dispatch', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/cancel", ['reason' => 'x'])->assertStatus(409);
    });

    it('returns a parcel: reason required, good back to stock, damaged recorded, charge to ledger, customer flagged', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product, 3)->json('data.id');
        advance($this->owner, $this->shop, $id, 'dispatch');
        $itemId = Order::withoutGlobalScopes()->find($id)->items()->value('id');

        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/return", ['items' => []])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/return", [
            'reason' => 'Customer refused',
            'items' => [['order_item_id' => $itemId, 'damaged_qty' => 1]],
            'return_charge' => '200',
        ])->assertOk()
            ->assertJsonPath('data.status.value', 'returned')
            ->assertJsonPath('data.items.0.returned_good_qty', 2)
            ->assertJsonPath('data.items.0.returned_damaged_qty', 1);

        expect(stockOf($this->product))->toBe(9)
            ->and(LedgerEntry::withoutGlobalScopes()->where('type', 'return_charge')->value('amount'))->toBe('-200.00');

        // Next order for the same phone shows the warning (D19).
        $this->actingAs($this->owner)->getJson("/api/v1/shops/{$this->shop->id}/customers/lookup?phone=0771234567")
            ->assertJsonPath('data.warnings.0.code', 'returned_before');
    });

    it('refunds a paid order that came back', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/payments", ['payment_method_id' => codMethod($this->shop)->id])->assertOk()
            ->assertJsonPath('data.payment_status.value', 'paid');
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/refund")->assertStatus(409);
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/cancel", ['reason' => 'Out of area'])->assertOk()
            ->assertJsonPath('data.available_actions', ['refund', 'add_note', 'print_invoice']);
        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/refund", ['reference' => 'BANK-77'])->assertOk()
            ->assertJsonPath('data.payment_status.value', 'refunded');

        expect(LedgerEntry::withoutGlobalScopes()->where('order_id', $id)->sum('amount'))->toEqual(0);
    });

    it('requires a slip for slip methods and stores it privately', function () {
        Storage::fake('local');
        $id = placeOrder($this->owner, $this->shop, $this->product, 1, ['payment_method_id' => bankMethod($this->shop)->id])->json('data.id');

        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/payments", [])->assertStatus(422)->assertJsonPath('code', 'slip_required');
        $res = $this->actingAs($this->owner)->post("{$this->url}/{$id}/payments", [
            'reference' => 'TXN-1', 'slip' => UploadedFile::fake()->image('slip.jpg'),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.payments.0.has_slip', true);

        $paymentId = $res->json('data.payments.0.id');
        $this->actingAs($this->owner)->get("{$this->url}/{$id}/payments/{$paymentId}/slip")->assertOk();
    });
});

describe('notes and list', function () {
    it('adds notes and filters the list', function () {
        $id = placeOrder($this->owner, $this->shop, $this->product)->json('data.id');
        placeOrder($this->admin, $this->shop, $this->product, 1, ['customer' => ['phone' => '0761111111', 'name' => 'Sunil']]);

        $this->actingAs($this->owner)->postJson("{$this->url}/{$id}/notes", ['body' => 'Call after 5pm'])->assertCreated()
            ->assertJsonPath('data.body', 'Call after 5pm');
        $this->actingAs($this->owner)->getJson("{$this->url}/{$id}")->assertJsonPath('data.notes.0.body', 'Call after 5pm');

        $this->actingAs($this->owner)->getJson("{$this->url}?seller=gloma")->assertJsonCount(1, 'data')->assertJsonPath('data.0.customer_name', 'Sunil');
        $this->actingAs($this->owner)->getJson("{$this->url}?search=0761111111")->assertJsonCount(1, 'data');
        $this->actingAs($this->owner)->getJson("{$this->url}?search=ALPHA-000001")->assertJsonCount(1, 'data');
        $this->actingAs($this->owner)->getJson("{$this->url}?needs_action=1")->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'per_page', 'total']]);
    });
});
