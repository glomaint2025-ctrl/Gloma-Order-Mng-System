<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Models\Shop;
use App\Domain\Users\Perm;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Sanctum SPA cookie auth: GET /sanctum/csrf-cookie first, then POST /api/v1/auth/login.
 */
final class AuthController extends Controller
{
    public function login(Request $request, AuditLogger $audit): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $ok = Auth::guard('web')->attempt(
            ['email' => strtolower($credentials['email']), 'password' => $credentials['password'], 'is_active' => true],
            (bool) ($credentials['remember'] ?? false),
        );

        if (! $ok) {
            throw ValidationException::withMessages(['email' => 'Wrong email or password.']);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();
        $user->forceFill(['last_login_at' => now()])->save();
        $audit->log('auth.login', $user);

        return $this->me($request);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logged out.']);
    }

    /** Who am I + which shops can I open + what may I do. The UI builds its menu from this. */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? Auth::guard('web')->user();
        $isAdmin = $user->isGlomaAdmin();

        $shops = ($isAdmin ? Shop::query() : $user->shops())
            ->orderBy('name')
            ->get(['shops.id', 'shops.name', 'shops.code', 'shops.status', 'shops.stock_mode'])
            ->map(fn (Shop $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
                'status' => $s->status->toArray(),
                'stock_mode' => $s->stock_mode->toArray(),
                'can_open' => $isAdmin || $s->status !== ShopStatus::Suspended,
            ]);

        return response()->json(['data' => [
            'user' => new UserResource($user),
            'is_admin' => $isAdmin,
            'permissions' => $isAdmin ? Perm::all() : $user->getAllPermissions()->pluck('name')->values(),
            'shops' => $shops,
        ]]);
    }

    public function changePassword(Request $request, AuditLogger $audit): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:web'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->password = $data['password'];
        $user->save();
        $audit->log('auth.password_changed', $user);

        return response()->json(['message' => 'Password changed.']);
    }
}
