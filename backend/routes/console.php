<?php

use App\Domain\Customers\Models\Customer;
use App\Domain\Customers\Services\CustomerPrivacy;
use App\Domain\Notifications\Contracts\SmsGateway;
use App\Domain\Users\Perm;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;

/*
| Shared hosting has no daemon: cron runs `php artisan schedule:run` every minute (08-OPERATIONS),
| and the scheduler drains the database queue for up to ~50 seconds.
*/
Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=3 --backoff=60')
    ->everyMinute()->withoutOverlapping(5);
Schedule::call(fn () => Cache::forever('portal.cron_heartbeat', now()->toIso8601String()))
    ->everyMinute()->name('cron-heartbeat');
Schedule::command('portal:anonymize-customers')->monthlyOn(1, '02:30');
Schedule::command('queue:prune-failed --hours=720')->daily();

Artisan::command('portal:create-admin {email} {name} {--password=}', function (string $email, string $name) {
    $password = $this->option('password') ?: $this->secret('Password (min 8 chars)');
    if (strlen((string) $password) < 8) {
        $this->error('Password must be at least 8 characters.');

        return 1;
    }
    $user = User::query()->updateOrCreate(['email' => strtolower($email)], ['name' => $name, 'password' => $password, 'is_active' => true]);
    $user->assignRole(Perm::ROLE_ADMIN);
    $this->info("Gloma admin ready: {$user->email}");

    return 0;
})->purpose('Create or reset a Gloma admin login');

Artisan::command('portal:anonymize-customers {--dry-run}', function () {
    $cutoff = now()->subYears((int) config('portal.customer_retention_years'));
    $stale = Customer::withoutGlobalScopes()->whereNull('anonymized_at')
        ->where('updated_at', '<', $cutoff)
        ->whereDoesntHave('orders', fn ($q) => $q->withoutGlobalScopes()->where('created_at', '>=', $cutoff))
        ->get();

    $this->info("Customers to anonymise: {$stale->count()} (no orders since {$cutoff->toDateString()})");
    if ($this->option('dry-run')) {
        return 0;
    }

    foreach ($stale as $customer) {
        app(CustomerPrivacy::class)->erase($customer);
    }

    return 0;
})->purpose('PDPA retention: anonymise customers with no recent orders');

Artisan::command('portal:test-notify {phone} {email}', function (string $phone, string $email) {
    $sms = app(SmsGateway::class);
    $ref = $sms->send(Phone::normalize($phone) ?? $phone, config('app.name').' test SMS');
    $this->info("SMS sent, ref {$ref}");
    Mail::raw(config('app.name').' test email', fn ($m) => $m->to($email)->subject('Test email'));
    $this->info('Email sent.');
})->purpose('SPIKE-3: send one real SMS and one email with the configured providers');
