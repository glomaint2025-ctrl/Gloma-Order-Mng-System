<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Users\Perm;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

final class UserAdminController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** Filters: role (gloma_admin|shop_owner), search. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $f = $request->validate([
            'role' => ['nullable', Rule::in([Perm::ROLE_ADMIN, Perm::ROLE_OWNER])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        return UserResource::collection(User::query()->with('shops:id,name,code', 'roles')
            ->when($f['role'] ?? null, fn ($q, $r) => $q->role($r))
            ->when($f['search'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('name', 'like', "%{$t}%")->orWhere('email', 'like', "%{$t}%")))
            ->orderBy('name')->paginate(50));
    }

    /** Create a Gloma admin or a shop owner (owners are usually created with their shop). */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', Rule::in([Perm::ROLE_ADMIN, Perm::ROLE_OWNER])],
        ]);
        $user = User::create(['name' => $data['name'], 'email' => strtolower($data['email']), 'password' => $data['password'], 'phone' => $data['phone'] ?? null]);
        $user->assignRole($data['role']);
        $this->audit->log('user.created', $user, ['email' => $user->email, 'role' => $data['role']]);

        return (new UserResource($user->load('shops')))->response()->setStatusCode(201);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load('shops'));
    }

    /** Edit details, (de)activate, or set a new password (admin password reset). */
    public function update(Request $request, User $user): UserResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['sometimes', Password::min(8)],
        ]);
        if (($data['is_active'] ?? true) === false && $user->is($request->user())) {
            throw new BusinessRuleException('self_deactivate', 'You cannot deactivate your own login.', 422);
        }
        $user->fill($data)->save();
        $this->audit->log('user.updated', $user, array_map(fn () => 'changed', array_diff_key($user->getChanges(), ['updated_at' => 1])));

        return new UserResource($user->load('shops'));
    }
}
