import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Coins,
  BarChart3,
  Settings,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/app/useAuth'
import { hasPermission } from '@/lib/permissions'

export interface SidebarProps {
  onCloseMobile?: () => void
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const { me, currentShop } = useAuth()
  const shopId = currentShop?.id

  if (!shopId) return null

  const navItems = [
    {
      to: `/shops/${shopId}/dashboard`,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      allowed: true,
    },
    {
      to: `/shops/${shopId}/orders`,
      label: 'Orders',
      icon: <ShoppingCart className="w-4 h-4" />,
      allowed: hasPermission('orders.manage', me) || hasPermission('orders.place', me),
    },
    {
      to: `/shops/${shopId}/orders/walk-in`,
      label: 'Walk-in Sale',
      icon: <Store className="w-4 h-4" />,
      allowed: hasPermission('orders.place', me),
    },
    {
      to: `/shops/${shopId}/products`,
      label: 'Products',
      icon: <Package className="w-4 h-4" />,
      allowed: true,
    },
    {
      to: `/shops/${shopId}/stock`,
      label: 'Stock & Movements',
      icon: <Layers className="w-4 h-4" />,
      allowed: true,
    },
    {
      to: `/shops/${shopId}/purchases`,
      label: 'Purchases',
      icon: <ShoppingBag className="w-4 h-4" />,
      allowed: true,
    },
    {
      to: `/shops/${shopId}/customers`,
      label: 'Customers',
      icon: <Users className="w-4 h-4" />,
      allowed: hasPermission('customers.manage', me),
    },
    {
      to: `/shops/${shopId}/money`,
      label: 'Money & Ledger',
      icon: <Coins className="w-4 h-4" />,
      allowed: hasPermission('reports.view', me) || hasPermission('ledger.manage', me),
    },
    {
      to: `/shops/${shopId}/reports`,
      label: 'Sales Report',
      icon: <BarChart3 className="w-4 h-4" />,
      allowed: hasPermission('reports.view', me),
    },
    {
      to: `/shops/${shopId}/settings`,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      allowed: hasPermission('shop.settings', me),
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-xs">
            G
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm tracking-tight block">GLOMA</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-medium">Shop Portal</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Shop Operations
        </div>
        {navItems
          .filter((item) => item.allowed)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

        {me?.is_admin && (
          <div className="pt-6">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Gloma Admin Area
            </div>
            <NavLink
              to="/admin/dashboard"
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-purple-700" />
              Switch to Admin Portal
            </NavLink>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="px-2 py-1 text-[11px] text-gray-500 truncate">
          Logged in as <span className="font-semibold text-gray-800">{me?.user.name}</span>
        </div>
      </div>
    </aside>
  )
}
