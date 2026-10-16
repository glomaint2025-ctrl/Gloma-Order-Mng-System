<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Notifications\Models\MessageTemplate;
use Illuminate\Database\Seeder;

/** Global default templates (D46). Not overwritten if Gloma already edited them. */
class TemplatesSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            [
                'event' => 'order_placed', 'channel' => 'email',
                'subject' => 'Your order {order_number} from {shop_name}',
                'body' => "Hi {customer_name},\n\nThank you for your order {order_number}.\nItems: {items}\nTotal: {total}\n\nYour bill is attached. We will let you know when it is on the way.\n\n{shop_name}",
            ],
            [
                'event' => 'order_dispatched', 'channel' => 'sms',
                'subject' => null,
                'body' => '{shop_name}: Your order {order_number} is on the way with {courier}. Track: {tracking_url}',
            ],
            [
                'event' => 'order_dispatched', 'channel' => 'email',
                'subject' => 'Your order {order_number} is on the way',
                'body' => "Hi {customer_name},\n\nYour order {order_number} was handed to {courier}.\nTracking number: {tracking_number}\nTrack it here: {tracking_url}\n\n{shop_name}",
            ],
        ];

        foreach ($defaults as $template) {
            MessageTemplate::query()->firstOrCreate(
                ['shop_id' => null, 'event' => $template['event'], 'channel' => $template['channel']],
                ['subject' => $template['subject'], 'body' => $template['body'], 'is_active' => true],
            );
        }
    }
}
