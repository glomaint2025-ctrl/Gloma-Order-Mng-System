import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { useAuth } from './authContext'

// Feature Pages
import { LoginPage } from '@/features/auth/LoginPage'
import { ShopPickerPage } from '@/features/shops/ShopPickerPage'
import { ShopDashboardPage } from '@/features/dashboard/ShopDashboardPage'

// Orders
import { OrdersListPage } from '@/features/orders/OrdersListPage'
import { OrderFormPage } from '@/features/orders/OrderFormPage'
import { WalkInPage } from '@/features/orders/WalkInPage'
import { OrderDetailPage } from '@/features/orders/OrderDetailPage'

// Products & Inventory
import { ProductsPage } from '@/features/products/ProductsPage'
import { StockPage } from '@/features/stock/StockPage'
import { PurchasesPage } from '@/features/purchases/PurchasesPage'

// Customers & Money
import { CustomersPage } from '@/features/customers/CustomersPage'
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage'
import { LedgerPage } from '@/features/money/LedgerPage'
import { ReportsPage } from '@/features/money/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

// Admin Area
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage'
import { ShopsAdminPage } from '@/features/admin/ShopsAdminPage'
import { ShopFormPage } from '@/features/admin/ShopFormPage'
import { UsersAdminPage } from '@/features/admin/UsersAdminPage'
import { CouriersAdminPage } from '@/features/admin/CouriersAdminPage'
import { GlomaCouriersPage } from '@/features/admin/GlomaCouriersPage'
import { GlobalTemplatesPage } from '@/features/admin/GlobalTemplatesPage'
import { SmsUsagePage } from '@/features/admin/SmsUsagePage'
import { AuditLogPage } from '@/features/admin/AuditLogPage'

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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
        element: <ShopPickerPage />,
      },
      // Inside a shop
      {
        path: 'shops/:shopId/dashboard',
        element: <ShopDashboardPage />,
      },
      {
        path: 'shops/:shopId/orders',
        element: <OrdersListPage />,
      },
      {
        path: 'shops/:shopId/orders/new',
        element: <OrderFormPage />,
      },
      {
        path: 'shops/:shopId/orders/walk-in',
        element: <WalkInPage />,
      },
      {
        path: 'shops/:shopId/orders/:orderId',
        element: <OrderDetailPage />,
      },
      {
        path: 'shops/:shopId/orders/:orderId/edit',
        element: <OrderFormPage />,
      },
      {
        path: 'shops/:shopId/products',
        element: <ProductsPage />,
      },
      {
        path: 'shops/:shopId/stock',
        element: <StockPage />,
      },
      {
        path: 'shops/:shopId/purchases',
        element: <PurchasesPage />,
      },
      {
        path: 'shops/:shopId/customers',
        element: <CustomersPage />,
      },
      {
        path: 'shops/:shopId/customers/:customerId',
        element: <CustomerDetailPage />,
      },
      {
        path: 'shops/:shopId/money',
        element: <LedgerPage />,
      },
      {
        path: 'shops/:shopId/reports',
        element: <ReportsPage />,
      },
      {
        path: 'shops/:shopId/settings',
        element: <SettingsPage />,
      },
      // Admin Area
      {
        path: 'admin',
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'admin/dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'admin/shops',
        element: <ShopsAdminPage />,
      },
      {
        path: 'admin/shops/new',
        element: <ShopFormPage />,
      },
      {
        path: 'admin/shops/:id',
        element: <ShopFormPage />,
      },
      {
        path: 'admin/users',
        element: <UsersAdminPage />,
      },
      {
        path: 'admin/couriers',
        element: <CouriersAdminPage />,
      },
      {
        path: 'admin/courier-accounts',
        element: <GlomaCouriersPage />,
      },
      {
        path: 'admin/templates',
        element: <GlobalTemplatesPage />,
      },
      {
        path: 'admin/sms-usage',
        element: <SmsUsagePage />,
      },
      {
        path: 'admin/audit',
        element: <AuditLogPage />,
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
