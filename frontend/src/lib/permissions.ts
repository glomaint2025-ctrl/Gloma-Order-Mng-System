import type { MeData } from '@/api/types'

export function hasPermission(permission: string, me: MeData | null | undefined): boolean {
  if (!me) return false
  if (me.is_admin) return true
  return me.permissions?.includes(permission) ?? false
}
