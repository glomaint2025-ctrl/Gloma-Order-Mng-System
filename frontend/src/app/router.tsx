import type React from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { useAuth } from '@/app/useAuth'

import { LoginPage } from '@/features/auth/LoginPage'





/** Code-split each page: its JS loads the first time the route is opened. */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return async () => ({ Component: (await load())[name] as React.ComponentType })
}

function RootRedirect() {
  const { me, isLoading } = useAuth()

  if (isLoading) return null
  if (!me) return <Navigate to="/login" replace />

  if (me.is_admin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const openShops = me.shops.filter((s) => s.can_open)
  if (openShops.length === 1) {
    return <Navigate to={`/shops/${openShops[0].id}/dashboard`} replace />
  }

  return <Navigate to="/shops" replace />
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold text-gray-900 font-mono">404</h1>
      <p className="text-sm text-gray-500 mt-2">The requested page or order could not be found.</p>
      <a
        href="/"
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
      >
        Return to Portal
      </a>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    lazy: page(() => import('@/features/auth/PasswordResetPages'), 'ForgotPasswordPage'),
  },
  {
    path: '/reset-password',
    lazy: page(() => import('@/features/auth/PasswordResetPages'), 'ResetPasswordPage'),
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: 'shops',
        lazy: page(() => import('@/features/shops/ShopPickerPage'), 'ShopPickerPage'),
      },
      // Inside a shop
      {
        path: 'shops/:shopId/dashboard',
        lazy: page(() => import('@/features/dashboard/ShopDashboardPage'), 'ShopDashboardPage'),
      },
      {
        path: 'shops/:shopId/orders',
        lazy: page(() => import('@/features/orders/OrdersListPage'), 'OrdersListPage'),
      },
      {
        path: 'shops/:shopId/orders/new',
        lazy: page(() => import('@/features/orders/OrderFormPage'), 'OrderFormPage'),
      },
      {
        path: 'shops/:shopId/orders/walk-in',
        lazy: page(() => import('@/features/orders/WalkInPage'), 'WalkInPage'),
      },
      {
        path: 'shops/:shopId/orders/:orderId',
        lazy: page(() => import('@/features/orders/OrderDetailPage'), 'OrderDetailPage'),
      },
      {
        path: 'shops/:shopId/orders/:orderId/edit',
        lazy: page(() => import('@/features/orders/OrderFormPage'), 'OrderFormPage'),
      },
      {
        path: 'shops/:shopId/products',
        lazy: page(() => import('@/features/products/ProductsPage'), 'ProductsPage'),
      },
      {
        path: 'shops/:shopId/stock',
        lazy: page(() => import('@/features/stock/StockPage'), 'StockPage'),
      },
      {
        path: 'shops/:shopId/purchases',
        lazy: page(() => import('@/features/purchases/PurchasesPage'), 'PurchasesPage'),
      },
      {
        path: 'shops/:shopId/customers',
        lazy: page(() => import('@/features/customers/CustomersPage'), 'CustomersPage'),
      },
      {
        path: 'shops/:shopId/customers/:customerId',
        lazy: page(() => import('@/features/customers/CustomerDetailPage'), 'CustomerDetailPage'),
      },
      {
        path: 'shops/:shopId/money',
        lazy: page(() => import('@/features/money/LedgerPage'), 'LedgerPage'),
      },
      {
        path: 'shops/:shopId/reports',
        lazy: page(() => import('@/features/money/ReportsPage'), 'ReportsPage'),
      },
      {
        path: 'shops/:shopId/settings',
        lazy: page(() => import('@/features/settings/SettingsPage'), 'SettingsPage'),
      },
      // Admin Area
      {
        path: 'admin',
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'admin/dashboard',
        lazy: page(() => import('@/features/admin/AdminDashboardPage'), 'AdminDashboardPage'),
      },
      {
        path: 'admin/shops',
        lazy: page(() => import('@/features/admin/ShopsAdminPage'), 'ShopsAdminPage'),
      },
      {
        path: 'admin/shops/new',
        lazy: page(() => import('@/features/admin/ShopFormPage'), 'ShopFormPage'),
      },
      {
        path: 'admin/shops/:id',
        lazy: page(() => import('@/features/admin/ShopFormPage'), 'ShopFormPage'),
      },
      {
        path: 'admin/users',
        lazy: page(() => import('@/features/admin/UsersAdminPage'), 'UsersAdminPage'),
      },
      {
        path: 'admin/couriers',
        lazy: page(() => import('@/features/admin/CouriersAdminPage'), 'CouriersAdminPage'),
      },
      {
        path: 'admin/courier-accounts',
        lazy: page(() => import('@/features/admin/GlomaCouriersPage'), 'GlomaCouriersPage'),
      },
      {
        path: 'admin/templates',
        lazy: page(() => import('@/features/admin/GlobalTemplatesPage'), 'GlobalTemplatesPage'),
      },
      {
        path: 'admin/sms-usage',
        lazy: page(() => import('@/features/admin/SmsUsagePage'), 'SmsUsagePage'),
      },
      {
        path: 'admin/audit',
        lazy: page(() => import('@/features/admin/AuditLogPage'), 'AuditLogPage'),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
