import { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AdminSidebar } from './AdminSidebar'
import { Topbar } from './Topbar'
import { useAuth } from '../authContext'
import { Spinner } from '@/components/ui/Spinner'
import { AlertCircle } from 'lucide-react'

export function AppShell() {
  const { me, isLoading, currentShop } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-indigo-600" />
          <span className="text-xs text-gray-500 font-medium tracking-wide">Loading Gloma Portal...</span>
        </div>
      </div>
    )
  }

  if (!me) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const isAdminView = location.pathname.startsWith('/admin')
  const isShopClosed = currentShop?.status.value === 'closed'

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        {isAdminView ? <AdminSidebar /> : <Sidebar />}
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 shadow-2xl">
            {isAdminView ? (
              <AdminSidebar onCloseMobile={() => setMobileNavOpen(false)} />
            ) : (
              <Sidebar onCloseMobile={() => setMobileNavOpen(false)} />
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleMobileNav={() => setMobileNavOpen(true)} isAdminView={isAdminView} />

        {/* Closed shop banner */}
        {!isAdminView && isShopClosed && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-inner">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This shop is closed (contract ended). It is read-only for shop operations.</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
