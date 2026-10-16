<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Mail;

use App\Domain\Notifications\Models\MessageLog;
use App\Domain\Orders\Documents\OrderDocuments;
use App\Domain\Orders\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Plain e-mail built from the template text. The first line of the stored body is the subject.
 * The e-bill (order placed) carries the invoice PDF.
 */
final class OrderMessageMail extends Mailable
{
    use Queueable;

    public function __construct(public readonly MessageLog $log, public readonly bool $attachInvoice = false) {}

    public function envelope(): Envelope
    {
        [$subject] = $this->split();

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        [, $body] = $this->split();

        return new Content(text: 'mail.order-message', with: ['body' => $body]);
    }

    /** @return list<Attachment> */
    public function attachments(): array
    {
        if (! $this->attachInvoice || $this->log->order_id === null) {
            return [];
        }

        /** @var Order $order */
        $order = Order::withoutGlobalScopes()->findOrFail($this->log->order_id);
        $pdf = app(OrderDocuments::class)->invoice(collect([$order]));

        return [Attachment::fromData(fn () => $pdf, "invoice-{$order->number}.pdf")->withMime('application/pdf')];
    }

    /** @return array{0: string, 1: string} */
    private function split(): array
    {
        $parts = explode("\n\n", $this->log->body, 2);

        return count($parts) === 2 ? [$parts[0], $parts[1]] : ['Your order', $parts[0]];
    }
}
