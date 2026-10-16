<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Shop;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Catalog\Models\Product;
use App\Domain\Inventory\Actions\AdjustStock;
use App\Domain\Inventory\Actions\RecordPurchase;
use App\Domain\Inventory\Actions\SwitchStockMode;
use App\Domain\Inventory\Enums\MovementType;
use App\Domain\Inventory\Enums\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\Models\StockPurchase;
use App\Domain\Shops\Enums\StockMode;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\PurchaseResource;
use App\Http\Resources\ShopResource;
use App\Http\Resources\StockMovementResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Products, stock and purchases inside a shop. Writes are Gloma-admin only (route middleware `can:`).
 */
final class CatalogController extends Controller
{
    /** Filters: search, active (true/false), low_stock (true). `for_order=1` = active products with stock, for the order form. */
    public function products(Request $request, Shop $shop): AnonymousResourceCollection
    {
        $f = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'active' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:200'],
        ]);

        $products = Product::query()->with('stockLevels')
            ->when($f['search'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('name', 'like', "%{$t}%")->orWhere('sku', 'like', "%{$t}%")))
            ->when($request->has('active'), fn ($q) => $q->where('is_active', $request->boolean('active')))
            ->orderBy('name')
            ->paginate($f['per_page'] ?? 50);

        return ProductResource::collection($products);
    }

    public function showProduct(Shop $shop, Product $product): ProductResource
    {
        return new ProductResource($product->load('stockLevels'));
    }

    public function storeProduct(Request $request, Shop $shop, AuditLogger $audit): JsonResponse
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:60', Rule::unique('products')->where('shop_id', $shop->id)],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999'],
        ]);
        $product = Product::create($data + ['shop_id' => $shop->id]);
        $audit->log('product.created', $product, $data);

        return (new ProductResource($product->load('stockLevels')))->response()->setStatusCode(201);
    }

    public function updateProduct(Request $request, Shop $shop, Product $product, AuditLogger $audit): ProductResource
    {
        $data = $request->validate([
            'sku' => ['sometimes', 'string', 'max:60', Rule::unique('products')->where('shop_id', $shop->id)->ignore($product->id)],
            'name' => ['sometimes', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $product->fill($data)->save();
        $audit->logModelChange('product.updated', $product);

        return new ProductResource($product->load('stockLevels'));
    }

    /** Filters: product_id, type, location. Newest first. */
    public function movements(Request $request, Shop $shop): AnonymousResourceCollection
    {
        $f = $request->validate([
            'product_id' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::enum(MovementType::class)],
            'location' => ['nullable', Rule::enum(StockLocation::class)],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:200'],
        ]);

        return StockMovementResource::collection(StockMovement::query()->with('product:id,sku,name', 'user:id,name')
            ->when($f['product_id'] ?? null, fn ($q, $v) => $q->where('product_id', $v))
            ->when($f['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->when($f['location'] ?? null, fn ($q, $v) => $q->where('location', $v))
            ->latest('id')->paginate($f['per_page'] ?? 50));
    }

    public function adjust(Request $request, Shop $shop, AdjustStock $action): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'type' => ['required', Rule::in(array_map(fn ($t) => $t->value, MovementType::manualAdjustments()))],
            'location' => ['nullable', Rule::enum(StockLocation::class)],
            'qty' => ['required', 'integer', 'not_in:0', 'between:-100000,100000'],
            'reason' => ['required', 'string', 'max:255'],
        ]);
        $product = Product::query()->findOrFail($data['product_id']);
        $location = isset($data['location']) ? StockLocation::from($data['location']) : StockLocation::forMode($shop->stock_mode)[0];

        $movement = $action->adjust($shop, $this->user($request), $product, MovementType::from($data['type']), $location, (int) $data['qty'], $data['reason']);

        return (new StockMovementResource($movement->load('product', 'user')))->response()->setStatusCode(201);
    }

    public function transfer(Request $request, Shop $shop, AdjustStock $action): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'from' => ['required', Rule::in(['gloma', 'shop'])],
            'to' => ['required', Rule::in(['gloma', 'shop']), 'different:from'],
            'qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);
        $product = Product::query()->findOrFail($data['product_id']);
        $action->transfer($shop, $this->user($request), $product, StockLocation::from($data['from']), StockLocation::from($data['to']), (int) $data['qty'], $data['reason'] ?? null);

        return response()->json(['data' => new ProductResource($product->load('stockLevels'))], 201);
    }

    /** split: [{product_id, gloma, shop}] — required per product when switching to by_location (defaults: all at Gloma). */
    public function switchMode(Request $request, Shop $shop, SwitchStockMode $action): ShopResource
    {
        $data = $request->validate([
            'stock_mode' => ['required', Rule::enum(StockMode::class)],
            'split' => ['sometimes', 'array'],
            'split.*.product_id' => ['required', 'integer'],
            'split.*.gloma' => ['required', 'integer', 'min:0'],
            'split.*.shop' => ['required', 'integer', 'min:0'],
        ]);
        $split = collect($data['split'] ?? [])->mapWithKeys(fn ($s) => [(int) $s['product_id'] => ['gloma' => (int) $s['gloma'], 'shop' => (int) $s['shop']]])->all();

        return new ShopResource($action->handle($shop, $this->user($request), StockMode::from($data['stock_mode']), $split));
    }

    public function purchases(Request $request, Shop $shop): AnonymousResourceCollection
    {
        return PurchaseResource::collection(StockPurchase::query()->withCount('lines')->with('creator:id,name')
            ->latest('purchased_on')->latest('id')->paginate((int) $request->input('per_page', 25)));
    }

    public function showPurchase(Shop $shop, StockPurchase $purchase): PurchaseResource
    {
        return new PurchaseResource($purchase->load('lines.product', 'creator'));
    }

    public function storePurchase(Request $request, Shop $shop, RecordPurchase $action): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['nullable', 'string', 'max:100'],
            'supplier' => ['nullable', 'string', 'max:150'],
            'purchased_on' => ['required', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1', 'max:200'],
            'lines.*.product_id' => ['required', 'integer'],
            'lines.*.qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'lines.*.location' => ['nullable', Rule::enum(StockLocation::class)],
        ]);

        $purchase = $action->handle($shop, $this->user($request), $data);

        return (new PurchaseResource($purchase->load('creator')))->response()->setStatusCode(201);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
