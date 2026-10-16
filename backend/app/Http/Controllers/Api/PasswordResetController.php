<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Audit\Services\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * "Forgot password" by email. The link opens the SPA at /reset-password?token=…&email=… (AppServiceProvider).
 */
final class PasswordResetController extends Controller
{
    /** Always the same answer, so the endpoint cannot be used to find out which emails have accounts. */
    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        Password::broker()->sendResetLink(['email' => strtolower($data['email']), 'is_active' => true]);

        return response()->json(['message' => 'If that email has an account, a reset link is on its way. It works for 60 minutes.']);
    }

    public function reset(Request $request, AuditLogger $audit): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::broker()->reset(
            ['email' => strtolower($data['email']), 'token' => $data['token'], 'password' => $data['password'], 'password_confirmation' => $request->input('password_confirmation')],
            function (User $user, string $password) use ($audit) {
                $user->forceFill(['password' => $password, 'remember_token' => null])->save();
                $audit->log('auth.password_reset', $user);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'This reset link is invalid or has expired. Ask for a new one.']);
        }

        return response()->json(['message' => 'Password changed. You can log in now.']);
    }
}
