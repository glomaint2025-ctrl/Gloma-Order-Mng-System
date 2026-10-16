<?php

use App\Domain\Users\Perm;
use App\Http\Controllers\Api\Admin\ReportAdminController;
use App\Http\Controllers\Api\Admin\SetupAdminController;
use App\Http\Controllers\Api\Admin\ShopAdminController;
use App\Http\Controllers\Api\Admin\UserAdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\Shop\CatalogController;
use App\Http\Controllers\Api\Shop\CustomerController;
use App\Http\Controllers\Api\Shop\DocumentController;
use App\Http\Controllers\Api\Shop\FinanceController;
use App\Http\Controllers\Api\Shop\OrderController;
use App\Http\Controllers\Api\Shop\SettingsController;
use Illuminate\Support\Facades\Route;

/*
| THE CONTRACT — base /api/v1. Full field list: docs/API.md.
*/

Route::get('health', [MetaController::class, 'health'])->name('health');
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');
Route::post('auth/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:login')->name('auth.forgot');
Route::post('auth/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:login')->name('auth.reset');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
    Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::post('auth/password', [AuthController::class, 'changePassword'])->name('auth.password');
    Route::get('meta', [MetaController::class, 'meta'])->name('meta');

    // ---- Gloma admin ---------------------------------------------------------------
    Route::prefix('admin')->name('admin.')->middleware('can:'.Perm::SHOPS_MANAGE)->group(function () {
        Route::get('dashboard', [ReportAdminController::class, 'dashboard'])->name('dashboard');
        Route::get('sms-usage', [ReportAdminController::class, 'smsUsage'])->name('sms-usage');

        Route::get('shops', [ShopAdminController::class, 'index'])->name('shops.index');
        Route::post('shops', [ShopAdminController::class, 'store'])->name('shops.store');
        Route::get('shops/{shop}', [ShopAdminController::class, 'show'])->name('shops.show');
        Route::patch('shops/{shop}', [ShopAdminController::class, 'update'])->name('shops.update');
        Route::post('shops/{shop}/status', [ShopAdminController::class, 'setStatus'])->name('shops.status');
        Route::post('shops/{shop}/owners', [ShopAdminController::class, 'addOwner'])->name('shops.owners.add');
        Route::delete('shops/{shop}/owners/{user}', [ShopAdminController::class, 'removeOwner'])->name('shops.owners.remove');

        Route::get('users', [UserAdminController::class, 'index'])->name('users.index');
        Route::post('users', [UserAdminController::class, 'store'])->name('users.store');
        Route::get('users/{user}', [UserAdminController::class, 'show'])->name('users.show');
        Route::patch('users/{user}', [UserAdminController::class, 'update'])->name('users.update');

        Route::get('couriers', [SetupAdminController::class, 'couriers'])->name('couriers.index');
        Route::patch('couriers/{courier}', [SetupAdminController::class, 'updateCourier'])->name('couriers.update');
        Route::get('courier-accounts', [SetupAdminController::class, 'glomaAccounts'])->name('courier-accounts.index');
        Route::post('courier-accounts', [SetupAdminController::class, 'storeGlomaAccount'])->name('courier-accounts.store');
        Route::patch('courier-accounts/{account}', [SetupAdminController::class, 'updateGlomaAccount'])->name('courier-accounts.update');

        Route::get('templates', [SetupAdminController::class, 'templates'])->name('templates.index');
        Route::put('templates', [SetupAdminController::class, 'saveTemplate'])->name('templates.save');

        Route::get('audit-logs', [SetupAdminController::class, 'auditLogs'])->name('audit-logs');
    });

    // ---- Inside one shop (admin or the shop's owner) --------------------------------
    Route::prefix('shops/{shop}')->name('shop.')->middleware('tenant')->group(function () {
        Route::get('dashboard', [FinanceController::class, 'dashboard'])->name('dashboard');

        // Products & stock (writes: Gloma admin)
        Route::get('products', [CatalogController::class, 'products'])->name('products.index');
        Route::get('products/{product}', [CatalogController::class, 'showProduct'])->name('products.show');
        Route::get('stock/movements', [CatalogController::class, 'movements'])->name('stock.movements');
        Route::get('purchases', [CatalogController::class, 'purchases'])->name('purchases.index');
        Route::get('purchases/{purchase}', [CatalogController::class, 'showPurchase'])->name('purchases.show');
        Route::middleware('can:'.Perm::STOCK_MANAGE)->group(function () {
            Route::post('products', [CatalogController::class, 'storeProduct'])->name('products.store');
            Route::patch('products/{product}', [CatalogController::class, 'updateProduct'])->name('products.update');
            Route::post('products/{product}/image', [CatalogController::class, 'uploadImage'])->name('products.image');
            Route::delete('products/{product}/image', [CatalogController::class, 'deleteImage'])->name('products.image.delete');
            Route::post('stock/adjustments', [CatalogController::class, 'adjust'])->name('stock.adjust');
            Route::post('stock/transfers', [CatalogController::class, 'transfer'])->name('stock.transfer');
            Route::post('stock/mode', [CatalogController::class, 'switchMode'])->name('stock.mode');
            Route::post('purchases', [CatalogController::class, 'storePurchase'])->name('purchases.store');
        });

        // Orders
        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/export', [OrderController::class, 'export'])->middleware('can:'.Perm::REPORTS_VIEW)->name('orders.export');
        Route::post('orders', [OrderController::class, 'store'])->middleware('can:'.Perm::ORDERS_PLACE)->name('orders.store');
        Route::post('orders/print', [DocumentController::class, 'bulk'])->name('orders.print');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::patch('orders/{order}', [OrderController::class, 'update'])->name('orders.update');
        Route::post('orders/{order}/confirm', [OrderController::class, 'confirm'])->name('orders.confirm');
        Route::post('orders/{order}/pack', [OrderController::class, 'pack'])->name('orders.pack');
        Route::post('orders/{order}/dispatch', [OrderController::class, 'dispatch'])->name('orders.dispatch');
        Route::post('orders/{order}/deliver', [OrderController::class, 'deliver'])->name('orders.deliver');
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
        Route::post('orders/{order}/return', [OrderController::class, 'return'])->name('orders.return');
        Route::post('orders/{order}/payments', [OrderController::class, 'pay'])->name('orders.pay');
        Route::post('orders/{order}/refund', [OrderController::class, 'refund'])->name('orders.refund');
        Route::get('orders/{order}/payments/{payment}/slip', [OrderController::class, 'slip'])->name('orders.slip');
        Route::post('orders/{order}/notes', [OrderController::class, 'addNote'])->name('orders.notes');
        Route::get('orders/{order}/{type}.pdf', [DocumentController::class, 'single'])->whereIn('type', ['invoice', 'label'])->name('orders.pdf');

        // Customers
        Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::get('customers/lookup', [CustomerController::class, 'lookup'])->name('customers.lookup');
        Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
        Route::patch('customers/{customer}', [CustomerController::class, 'update'])->middleware('can:'.Perm::CUSTOMERS_MANAGE)->name('customers.update');
        Route::get('customers/{customer}/export', [CustomerController::class, 'exportData'])->middleware('can:'.Perm::PRIVACY_MANAGE)->name('customers.export');
        Route::post('customers/{customer}/erase', [CustomerController::class, 'erase'])->middleware('can:'.Perm::PRIVACY_MANAGE)->name('customers.erase');

        // Money & reports
        Route::get('reports/sales', [FinanceController::class, 'salesReport'])->middleware('can:'.Perm::REPORTS_VIEW)->name('reports.sales');
        Route::get('reports/sales/export', [FinanceController::class, 'exportSalesReport'])->middleware('can:'.Perm::REPORTS_VIEW)->name('reports.sales.export');
        Route::get('ledger', [FinanceController::class, 'ledger'])->middleware('can:'.Perm::REPORTS_VIEW)->name('ledger.index');
        Route::get('ledger/export', [FinanceController::class, 'exportLedger'])->middleware('can:'.Perm::REPORTS_VIEW)->name('ledger.export');
        Route::post('ledger', [FinanceController::class, 'storeLedger'])->middleware('can:'.Perm::LEDGER_MANAGE)->name('ledger.store');
        Route::get('messages', [FinanceController::class, 'messages'])->middleware('can:'.Perm::REPORTS_VIEW)->name('messages.index');

        // Settings (both roles)
        Route::middleware('can:'.Perm::SHOP_SETTINGS)->group(function () {
            Route::get('payment-methods', [SettingsController::class, 'paymentMethods'])->name('payment-methods.index');
            Route::post('payment-methods', [SettingsController::class, 'storePaymentMethod'])->name('payment-methods.store');
            Route::patch('payment-methods/{paymentMethod}', [SettingsController::class, 'updatePaymentMethod'])->name('payment-methods.update');
            Route::get('courier-accounts', [SettingsController::class, 'courierAccounts'])->name('courier-accounts.index');
            Route::post('courier-accounts', [SettingsController::class, 'storeCourierAccount'])->name('courier-accounts.store');
            Route::patch('courier-accounts/{account}', [SettingsController::class, 'updateCourierAccount'])->name('courier-accounts.update');
            Route::get('templates', [SettingsController::class, 'templates'])->name('templates.index');
            Route::put('templates', [SettingsController::class, 'saveTemplate'])->name('templates.save');
            Route::delete('templates', [SettingsController::class, 'resetTemplate'])->name('templates.reset');
        });
    });
});
