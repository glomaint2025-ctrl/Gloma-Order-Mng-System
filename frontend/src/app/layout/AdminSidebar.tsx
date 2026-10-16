import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Users,
  Truck,
  Building2,
  FileText,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '@/app/useAuth'

export interface AdminSidebarProps {
  onCloseMobile?: () => void
}

export function AdminSidebar({ onCloseMobile }: AdminSidebarProps) {
  const { me, currentShop } = useAuth()

  const adminNavItems = [
    {
      to: '/admin/dashboard',
      label: 'Admin Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      to: '/admin/shops',
      label: 'Partner Shops',
      icon: <Store className="w-4 h-4" />,
    },
    {
      to: '/admin/users',
      label: 'Owner Logins',
      icon: <Users className="w-4 h-4" />,
    },
    {
      to: '/admin/couriers',
      label: 'Couriers & Tracking',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      to: '/admin/courier-accounts',
      label: "Gloma's Couriers",
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      to: '/admin/templates',
      label: 'Global Templates',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      to: '/admin/sms-usage',
      label: 'SMS Usage & Billing',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      to: '/admin/audit',
      label: 'Audit Trail',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ]

  const returnPath = currentShop ? `/shops/${currentShop.id}/dashboard` : '/'

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm tracking-wider">
            A
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-tight block">GLOMA ADMIN</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Platform Management</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Admin Management
        </div>
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        <div className="pt-6">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          <NavLink
            to={returnPath}
            onClick={onCloseMobile}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop View
          </NavLink>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="px-2 py-1 text-[11px] text-slate-400 truncate">
          Admin: <span className="font-semibold text-white">{me?.user.name}</span>
        </div>
      </div>
    </aside>
  )
}
