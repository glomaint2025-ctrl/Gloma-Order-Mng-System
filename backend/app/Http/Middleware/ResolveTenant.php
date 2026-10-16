<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Shops\Enums\ShopStatus;
use App\Domain\Shops\Models\Shop;
use App\Domain\Shops\Tenancy\TenantContext;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves {shop} from the URL, checks membership, and sets the TenantContext BEFORE route-model binding,
 * so every child model ({order}, {product}…) is bound through the shop scope. Another shop's row → 404.
 */
final class ResolveTenant
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $param = $route?->parameter('shop');
        $shop = $param instanceof Shop ? $param : Shop::query()->find((int) $param);

        /** @var User|null $user */
        $user = $request->user();
        if ($shop === null || $user === null || ! $user->canAccessShop($shop)) {
            abort(404);
        }

        if ($shop->status === ShopStatus::Suspended && ! $user->isGlomaAdmin()) {
            return response()->json(['message' => 'This shop is suspended. Contact Gloma.', 'code' => 'shop_suspended'], 403);
        }

        $route->setParameter('shop', $shop);
        $this->tenant->set($shop);

        try {
            return $next($request);
        } finally {
            $this->tenant->set(null);
        }
    }
}
