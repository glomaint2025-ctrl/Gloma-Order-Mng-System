import { Menu, LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/app/useAuth'
import { ShopSwitcher } from './ShopSwitcher'
import { Badge } from '@/components/ui/Badge'

export interface TopbarProps {
  onToggleMobileNav: () => void
  isAdminView?: boolean
}

export function Topbar({ onToggleMobileNav, isAdminView = false }: TopbarProps) {
  const { me, logout } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {!isAdminView && <ShopSwitcher />}
        {isAdminView && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">Gloma Global Admin</span>
            <Badge tone="primary" size="sm">
              Super Admin
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-gray-900">{me?.user.name}</span>
          <span className="text-[10px] text-gray-500 flex items-center justify-end gap-1 font-medium">
            {me?.is_admin && <Shield className="w-3 h-3 text-indigo-600" />}
            {me?.user.role.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors cursor-pointer"
          title="Sign out of Gloma Portal"
        >
          <LogOut className="w-3.5 h-3.5 text-gray-500" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
