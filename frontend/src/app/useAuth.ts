import { createContext, useContext } from 'react'
import type { MeData, MetaData, ShopSummary } from '@/api/types'

export interface AuthContextType {
  me: MeData | null
  meta: MetaData | null
  isLoading: boolean
  currentShop: ShopSummary | null
  setCurrentShopId: (shopId: number) => void
  refreshMe: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
