<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Jobs;

use App\Domain\Notifications\Contracts\SmsGateway;
use App\Domain\Notifications\Enums\MessageChannel;
use App\Domain\Notifications\Enums\MessageEvent;
use App\Domain\Notifications\Mail\OrderMessageMail;
use App\Domain\Notifications\Models\MessageLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class SendMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public readonly int $messageLogId) {}

    public function handle(SmsGateway $sms): void
    {
        /** @var MessageLog|null $log */
        $log = MessageLog::withoutGlobalScopes()->find($this->messageLogId);
        if ($log === null || $log->status === 'sent') {
            return;
        }

        $log->attempts++;

        try {
            if ($log->channel === MessageChannel::Sms) {
                $log->provider_ref = $sms->send($log->recipient, $log->body);
            } else {
                Mail::to($log->recipient)->send(new OrderMessageMail($log, $log->event === MessageEvent::OrderPlaced));
            }
            $log->status = 'sent';
            $log->error = null;
            $log->save();
        } catch (Throwable $e) {
            $log->error = mb_substr($e->getMessage(), 0, 1000);
            $log->status = $this->attempts() >= $this->tries ? 'failed' : 'queued';
            $log->save();

            throw $e;
        }
    }

    public function failed(Throwable $e): void
    {
        MessageLog::withoutGlobalScopes()->whereKey($this->messageLogId)
            ->update(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 1000)]);
    }
}
