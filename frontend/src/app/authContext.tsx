import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMe, logout as apiLogout } from '@/api/auth'
import type { MeData, ShopSummary } from '@/api/types'
import { getMeta } from '@/api/meta'
import type { MetaData } from '@/api/types'

interface AuthContextType {
  me: MeData | null
  meta: MetaData | null
  isLoading: boolean
  currentShop: ShopSummary | null
  setCurrentShopId: (shopId: number) => void
  refreshMe: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeData | null>(null)
  const [meta, setMeta] = useState<MetaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentShopId, setCurrentShopIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem('gloma_current_shop_id')
    return saved ? parseInt(saved, 10) : null
  })

  const loadAuthAndMeta = async () => {
    try {
      const [meData, metaData] = await Promise.all([
        getMe().catch(() => null),
        getMeta().catch(() => null),
      ])

      setMe(meData)
      setMeta(metaData)

      if (meData?.shops && meData.shops.length > 0) {
        // If currentShopId is invalid or not in user's shops, pick the first can_open shop
        const exists = meData.shops.some((s) => s.id === currentShopId)
        if (!exists || !currentShopId) {
          const firstOpen = meData.shops.find((s) => s.can_open) || meData.shops[0]
          setCurrentShopIdState(firstOpen.id)
          localStorage.setItem('gloma_current_shop_id', String(firstOpen.id))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAuthAndMeta()
  }, [])

  const setCurrentShopId = (id: number) => {
    setCurrentShopIdState(id)
    localStorage.setItem('gloma_current_shop_id', String(id))
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch {
      // ignore logout network errors
    } finally {
      setMe(null)
      localStorage.removeItem('gloma_current_shop_id')
      window.location.href = '/login'
    }
  }

  const currentShop = me?.shops?.find((s) => s.id === currentShopId) || null

  return (
    <AuthContext.Provider
      value={{
        me,
        meta,
        isLoading,
        currentShop,
        setCurrentShopId,
        refreshMe: loadAuthAndMeta,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
