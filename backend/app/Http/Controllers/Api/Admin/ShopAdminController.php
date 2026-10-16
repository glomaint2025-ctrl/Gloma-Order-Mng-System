<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Domain\Shops\Actions\ManageShops;
use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Enums\StockMode;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Http\Resources\ShopResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

final class ShopAdminController extends Controller
{
    public function __construct(private readonly ManageShops $shops) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $f = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(ShopStatus::class)],
        ]);

        return ShopResource::collection(Shop::query()->with('owners')
            ->when($f['search'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('name', 'like', "%{$t}%")->orWhere('code', 'like', "%{$t}%")))
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->orderBy('name')->paginate(50));
    }

    /**
     * Body: shop fields + owner: {user_id} (existing owner) OR {name, email, password, phone} (new owner login).
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'alpha_num:ascii', 'min:2', 'max:12', 'unique:shops,code'],
            'stock_mode' => ['nullable', Rule::enum(StockMode::class)],
            'contract_ref' => ['nullable', 'string', 'max:80'],
            'contract_started_on' => ['nullable', 'date'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'owner' => ['required', 'array'],
            'owner.user_id' => ['nullable', 'integer', 'exists:users,id'],
            'owner.name' => ['required_without:owner.user_id', 'nullable', 'string', 'max:120'],
            'owner.email' => ['required_without:owner.user_id', 'nullable', 'email', 'max:150', 'unique:users,email'],
            'owner.password' => ['required_without:owner.user_id', 'nullable', Password::min(8)],
            'owner.phone' => ['nullable', 'string', 'max:20'],
        ]);

        return (new ShopResource($this->shops->create($data)))->response()->setStatusCode(201);
    }

    public function show(Shop $shop): ShopResource
    {
        return new ShopResource($shop->load('owners'));
    }

    public function update(Request $request, Shop $shop): ShopResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'contract_ref' => ['nullable', 'string', 'max:80'],
            'contract_started_on' => ['nullable', 'date'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        return new ShopResource($this->shops->update($shop, $data)->load('owners'));
    }

    /** status: active | suspended | closed (closed = contract ended, read-only, F5). */
    public function setStatus(Request $request, Shop $shop): ShopResource
    {
        $data = $request->validate(['status' => ['required', Rule::enum(ShopStatus::class)]]);

        return new ShopResource($this->shops->setStatus($shop, ShopStatus::from($data['status']))->load('owners'));
    }

    public function addOwner(Request $request, Shop $shop): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'name' => ['required_without:user_id', 'nullable', 'string', 'max:120'],
            'email' => ['required_without:user_id', 'nullable', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required_without:user_id', 'nullable', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        return (new UserResource($this->shops->addOwner($shop, $data)))->response()->setStatusCode(201);
    }

    public function removeOwner(Shop $shop, User $user): JsonResponse
    {
        $this->shops->removeOwner($shop, $user);

        return response()->json(['message' => 'Owner removed from shop.']);
    }
}
