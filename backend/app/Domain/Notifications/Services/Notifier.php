<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Jobs\SendMessage;
use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Models\Shop;
use App\Support\Money;
use App\Support\Phone;
use App\Support\SmsSegments;

/**
 * Queues customer messages for an order event. Never throws into the order flow:
 * a missing template or contact detail is logged as "skipped".
 */
final class Notifier
{
    public function __construct(private readonly TemplateRenderer $renderer) {}

    public function orderEvent(Order $order, MessageEvent $event): void
    {
        if ($order->isWalkIn()) {
            return;
        }

        /** @var Shop $shop */
        $shop = Shop::query()->findOrFail($order->shop_id);

        foreach ($event->channels() as $channel) {
            $recipient = $channel === MessageChannel::Sms ? $order->customer_phone : $order->customer_email;
            if ($recipient === null || $recipient === '') {
                continue;
            }

            $template = $this->renderer->resolve($shop, $event, $channel);
            if ($template === null) {
                continue;
            }

            $body = $this->renderer->render($template->body, $order, $shop);
            $log = new MessageLog([
                'shop_id' => $shop->id,
                'order_id' => $order->id,
                'event' => $event,
                'channel' => $channel,
                'recipient' => $recipient,
                'body' => $body,
                'status' => 'queued',
            ]);

            if ($channel === MessageChannel::Sms) {
                $log->segments = SmsSegments::count($body);
                $log->cost = Money::mul((string) config('portal.sms.cost_per_segment'), $log->segments);
                if (! Phone::isMobile($recipient)) {
                    $log->status = 'skipped';
                    $log->error = 'Not a mobile number.';
                    $log->segments = 0;
                    $log->cost = '0.00';
                }
            } else {
                $log->body = $template->subject
                    ? $this->renderer->render($template->subject, $order, $shop)."\n\n".$body
                    : $body;
            }

            $log->save();

            if ($log->status === 'queued') {
                SendMessage::dispatch($log->id)->afterCommit();
            }
        }
    }
}
