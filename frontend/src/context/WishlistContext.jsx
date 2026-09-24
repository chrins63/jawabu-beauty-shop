import { createContext, useEffect, useRef, useState } from 'react'
import { toWishlistItem } from '../lib/storeProduct'
import { loadRemoteWishlist, saveRemoteWishlist } from '../lib/accountSync'
import { useAuth } from './AuthContext'

export const WishlistContext = createContext(null) // eslint-disable-line react-refresh/only-export-components

const STORAGE_KEY = 'sleek-wishlist'

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth()
  const skipSync = useRef(true)
  const wishlistRef = useRef([])
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const savedWishlist = localStorage.getItem(STORAGE_KEY)

      return savedWishlist ? JSON.parse(savedWishlist) : []
    } catch (error) {
      console.error('Could not load wishlist:', error)
      return []
    }
  })

  wishlistRef.current = wishlistItems

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

  useEffect(() => {
    let cancelled = false
    skipSync.current = true

    async function hydrate() {
      if (!user?.id) {
        skipSync.current = false
        return
      }

      const remote = await loadRemoteWishlist(user.id)
      if (cancelled) {
        return
      }

      const merged = [...wishlistRef.current]
      for (const product of remote) {
        const item = toWishlistItem(product)
        if (!merged.some((current) => Number(current.id) === Number(item.id))) {
          merged.push(item)
        }
      }

      setWishlistItems(merged)
      await saveRemoteWishlist(user.id, merged)
      if (!cancelled) {
        skipSync.current = false
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (skipSync.current || !user?.id) {
      return undefined
    }

    const handle = setTimeout(() => {
      saveRemoteWishlist(user.id, wishlistItems)
    }, 400)

    return () => clearTimeout(handle)
  }, [wishlistItems, user?.id])

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
