import { createContext, useEffect, useState } from 'react'
import { toWishlistItem } from '../lib/storeProduct'

export const WishlistContext = createContext(null) // eslint-disable-line react-refresh/only-export-components

const STORAGE_KEY = 'sleek-wishlist'

export const WishlistProvider = ({ children }) => {
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
