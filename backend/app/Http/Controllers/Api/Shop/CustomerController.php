<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Shop;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Customers\Models\Customer;
use App\Domain\Customers\Services\CustomerService;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderListResource;
use App\Models\User;
use App\Support\BusinessRuleException;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CustomerController extends Controller
{
    /** Filters: search (name or phone), with_warning (true). */
    public function index(Request $request, Shop $shop): AnonymousResourceCollection
    {
        $f = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'with_warning' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        return CustomerResource::collection(Customer::query()
            ->whereNull('anonymized_at')
            ->when($f['search'] ?? null, function ($q, $term) {
                $phone = Phone::normalize($term);
                $q->where(fn ($w) => $w->where('name', 'like', "%{$term}%")->when($phone, fn ($p) => $p->orWhere('phone', $phone)));
            })
            ->when($request->boolean('with_warning'), fn ($q) => $q->where(fn ($w) => $w->where('is_risky', true)->orWhere('returns_count', '>', 0)))
            ->orderBy('name')
            ->paginate($f['per_page'] ?? 25));
    }

    /**
     * Used by the order form while typing a phone: returns the known customer (to pre-fill) and warnings.
     * Unknown phone → {customer: null, warnings: []}. Invalid phone → 422.
     */
    public function lookup(Request $request, Shop $shop, CustomerService $customers): JsonResponse
    {
        $request->validate(['phone' => ['required', 'string', 'max:20']]);
        $phone = Phone::normalize((string) $request->input('phone'));
        if ($phone === null) {
            throw new BusinessRuleException('invalid_phone', 'Enter a valid Sri Lankan phone number.', 422);
        }

        /** @var Customer|null $customer */
        $customer = Customer::query()->where('phone', $phone)->first();
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => [
            'phone' => $phone,
            'phone_local' => Phone::local($phone),
            'customer' => $customer ? CustomerResource::detailed($customer) : null,
            'warnings' => $customers->warnings($customer, $user),
        ]]);
    }

    public function show(Shop $shop, Customer $customer): JsonResponse
    {
        return response()->json(['data' => [
            'customer' => CustomerResource::detailed($customer),
            'recent_orders' => OrderListResource::collection(
                Order::query()->where('customer_id', $customer->id)->with('customer:id,is_risky,returns_count')->withCount('items')->latest('id')->limit(20)->get()
            ),
        ]]);
    }

    public function update(Request $request, Shop $shop, Customer $customer, AuditLogger $audit): CustomerResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:80'],
            'is_risky' => ['sometimes', 'boolean'],
            'risk_note' => ['nullable', 'string', 'max:255'],
        ]);
        $customer->fill($data)->save();
        $audit->logModelChange('customer.updated', $customer);

        return CustomerResource::detailed($customer);
    }
}
