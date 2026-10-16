<?php

declare(strict_types=1);

namespace App\Domain\Users;

/**
 * Permission names. Code checks permissions, never roles, so staff roles can be added later as seed rows (02-PHASES).
 */
final class Perm
{
    public const ROLE_ADMIN = 'gloma_admin';

    public const ROLE_OWNER = 'shop_owner';

    // Gloma admin only
    public const SHOPS_MANAGE = 'shops.manage';

    public const USERS_MANAGE = 'users.manage';

    public const COURIERS_MANAGE = 'couriers.manage';

    public const TEMPLATES_GLOBAL = 'templates.manage_global';

    public const AUDIT_VIEW = 'audit.view';

    public const ADMIN_REPORTS = 'admin.reports';

    public const PRODUCTS_MANAGE = 'products.manage';

    public const STOCK_MANAGE = 'stock.manage';

    public const LEDGER_MANAGE = 'ledger.manage';

    /** PDPA data-subject requests (export / erase one customer). */
    public const PRIVACY_MANAGE = 'privacy.manage';

    // Both roles
    public const ORDERS_PLACE = 'orders.place';

    public const ORDERS_MANAGE = 'orders.manage';

    public const PAYMENTS_RECORD = 'payments.record';

    public const CUSTOMERS_MANAGE = 'customers.manage';

    public const SHOP_SETTINGS = 'shop.settings';

    public const REPORTS_VIEW = 'reports.view';

    /** @return list<string> */
    public static function adminOnly(): array
    {
        return [
            self::SHOPS_MANAGE, self::USERS_MANAGE, self::COURIERS_MANAGE, self::TEMPLATES_GLOBAL,
            self::AUDIT_VIEW, self::ADMIN_REPORTS, self::PRODUCTS_MANAGE, self::STOCK_MANAGE, self::LEDGER_MANAGE,
            self::PRIVACY_MANAGE,
        ];
    }

    /** @return list<string> */
    public static function owner(): array
    {
        return [
            self::ORDERS_PLACE, self::ORDERS_MANAGE, self::PAYMENTS_RECORD, self::CUSTOMERS_MANAGE,
            self::SHOP_SETTINGS, self::REPORTS_VIEW,
        ];
    }

    /** @return list<string> */
    public static function all(): array
    {
        return [...self::adminOnly(), ...self::owner()];
    }
}
