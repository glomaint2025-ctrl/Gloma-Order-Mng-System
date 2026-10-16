import React, { useCallback, useEffect, useRef, useState } from 'react'
import { getMe, logout as apiLogout } from '@/api/auth'
import { getMeta } from '@/api/meta'
import type { MeData, MetaData } from '@/api/types'
import { AuthContext } from './useAuth'

const SHOP_KEY = 'gloma_current_shop_id'

function readSavedShopId(): number | null {
  try {
    const saved = localStorage.getItem(SHOP_KEY)
    return saved ? parseInt(saved, 10) : null
  } catch {
    return null
  }
}

function saveShopId(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(SHOP_KEY)
    else localStorage.setItem(SHOP_KEY, String(id))
  } catch {
    // storage unavailable (private mode): the shop choice just isn't remembered
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeData | null>(null)
  const [meta, setMeta] = useState<MetaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentShopId, setCurrentShopIdState] = useState<number | null>(readSavedShopId)
  // Read inside loadAuthAndMeta without making it depend on (and re-run for) every shop switch.
  const currentShopIdRef = useRef(currentShopId)

  const setCurrentShopId = useCallback((id: number) => {
    currentShopIdRef.current = id
    setCurrentShopIdState(id)
    saveShopId(id)
  }, [])

  const loadAuthAndMeta = useCallback(async () => {
    try {
      const [meData, metaData] = await Promise.all([getMe().catch(() => null), getMeta().catch(() => null)])

      setMe(meData)
      setMeta(metaData)

      if (meData?.shops && meData.shops.length > 0) {
        // If the saved shop is missing or no longer ours, pick the first shop that can be opened.
        const savedId = currentShopIdRef.current
        if (!savedId || !meData.shops.some((s) => s.id === savedId)) {
          const firstOpen = meData.shops.find((s) => s.can_open) || meData.shops[0]
          setCurrentShopId(firstOpen.id)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [setCurrentShopId])

  useEffect(() => {
    loadAuthAndMeta()
  }, [loadAuthAndMeta])

  const logout = async () => {
    try {
      await apiLogout()
    } catch {
      // ignore logout network errors
    } finally {
      setMe(null)
      saveShopId(null)
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
