import { createContext, useEffect, useRef, useState } from 'react'
import { loadRemoteWishlist, saveRemoteWishlist } from '../lib/accountSync'
import { toWishlistItem } from '../lib/storeProduct'
import { useAuth } from './AuthContext'

function mergeWishlist(localItems, remoteItems) {
  const merged = new Map()
  for (const item of [...remoteItems, ...localItems]) {
    merged.set(item.id, item)
  }
  return [...merged.values()]
}

export const WishlistContext = createContext(null) // eslint-disable-line react-refresh/only-export-components

const STORAGE_KEY = 'sleek-wishlist'

export const WishlistProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const [remoteReady, setRemoteReady] = useState(false)
  const wishlistRef = useRef([])
  const previousUserId = useRef(null)
  const seenAuth = useRef(false)

  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const savedWishlist = localStorage.getItem(STORAGE_KEY)

      return savedWishlist ? JSON.parse(savedWishlist) : []
    } catch (error) {
      console.error('Could not load wishlist:', error)
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(wishlistItems)
      )
    } catch (error) {
      console.error('Could not save wishlist:', error)
    }
  }, [wishlistItems])

  wishlistRef.current = wishlistItems

  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    let cancelled = false
    const previous = seenAuth.current ? previousUserId.current : null
    seenAuth.current = true
    const switching = Boolean(previous && user?.id && previous !== user.id)
    previousUserId.current = user?.id || null

    async function hydrate() {
      if (!user) {
        if (!cancelled) {
          setRemoteReady(true)
        }
        return
      }

      const remoteProducts = await loadRemoteWishlist(user.id)
      if (cancelled || remoteProducts == null) {
        return
      }

      const remote = remoteProducts.map((product) => toWishlistItem(product))
      const local = switching ? [] : wishlistRef.current
      setWishlistItems(mergeWishlist(local, remote))
      setRemoteReady(true)
    }

    setRemoteReady(false)
    hydrate()

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  useEffect(() => {
    if (!user || !remoteReady) {
      return undefined
    }

    const handle = window.setTimeout(() => {
      saveRemoteWishlist(user.id, wishlistItems)
    }, 500)

    return () => window.clearTimeout(handle)
  }, [remoteReady, user, wishlistItems])

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.id === productId)
  }

  const toggleWishlist = (product) => {
    const item = toWishlistItem(product)

    setWishlistItems((currentItems) => {
      const exists = currentItems.some(
        (current) => current.id === item.id
      )

      if (exists) {
        return currentItems.filter(
          (current) => current.id !== item.id
        )
      }

      return [...currentItems, item]
    })
  }

  const removeFromWishlist = (productId) => {
    setWishlistItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId)
    )
  }

  const clearWishlist = () => {
    setWishlistItems([])
  }

  const wishlistCount = wishlistItems.length

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}
