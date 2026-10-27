<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Couriers\Contracts\CourierGateway;
use App\Domain\Notifications\Contracts\SmsGateway;
use App\Domain\Shops\Tenancy\TenantContext;
use App\Domain\Users\Perm;
use App\Infrastructure\Couriers\ManualCourierGateway;
use App\Infrastructure\Sms\DialogEsmsSmsGateway;
use App\Infrastructure\Sms\LogSmsGateway;
use App\Infrastructure\Sms\TextLkSmsGateway;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(TenantContext::class);

        $this->app->bind(CourierGateway::class, ManualCourierGateway::class);

        $this->app->bind(SmsGateway::class, function () {
            return match (config('portal.sms.driver')) {
                'dialog' => new DialogEsmsSmsGateway(
                    (string) config('portal.sms.dialog.endpoint'),
                    (string) config('portal.sms.dialog.api_key'),
                    (string) config('portal.sms.dialog.sender_id'),
                ),
                'textlk' => new TextLkSmsGateway(
                    (string) config('portal.sms.textlk.base_url'),
                    (string) config('portal.sms.textlk.token'),
                    (string) config('portal.sms.textlk.sender_id'),
                ),
                default => new LogSmsGateway,
            };
        });
    }

    public function boot(): void
    {
        // Catch typos in mass assignment early; lazy loading stays allowed (lists eager-load what they need).
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        // Reset links open the SPA, which posts to /api/v1/auth/reset-password.
        ResetPassword::createUrlUsing(fn (User $user, string $token) => rtrim((string) config('app.url'), '/')
            .'/reset-password?token='.$token.'&email='.urlencode($user->email));

        // Gloma admin passes every permission check (spatie permissions are still seeded for clarity / staff later).
        Gate::before(fn (User $user) => $user->hasRole(Perm::ROLE_ADMIN) ? true : null);

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip())
            ->response(fn () => response()->json(['message' => 'Too many login attempts. Wait a minute and try again.', 'code' => 'too_many_attempts'], 429)));

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(240)->by($request->user()?->getAuthIdentifier() ?: $request->ip()));
    }
}
