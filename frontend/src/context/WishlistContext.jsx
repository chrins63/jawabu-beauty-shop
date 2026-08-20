/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

export const WishlistContext = createContext(null)

const STORAGE_KEY = 'jawabu-wishlist'


export const WishlistProvider = ({ children }) => {

  const [wishlistItems, setWishlistItems] = useState(() => {

    try {

      const savedWishlist =
        localStorage.getItem(STORAGE_KEY)

      return savedWishlist
        ? JSON.parse(savedWishlist)
        : []

    } catch (error) {

      console.error(
        'Could not load wishlist:',
        error
      )

      return []

    }

  })


  // Save wishlist whenever it changes
  useEffect(() => {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(wishlistItems)
    )

  }, [wishlistItems])


  // Check if product is already saved
  const isInWishlist = (productId) => {

    return wishlistItems.some(
      (item) => item.id === productId
    )

  }


  // Add / remove product
  const toggleWishlist = (product) => {

    setWishlistItems((currentItems) => {

      const exists = currentItems.some(
        (item) => item.id === product.id
      )


      // Remove if already saved
      if (exists) {

        return currentItems.filter(
          (item) => item.id !== product.id
        )

      }


      // Add product
      return [
        ...currentItems,
        product
      ]

    })

  }


  // Remove one product
  const removeFromWishlist = (productId) => {

    setWishlistItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== productId
      )
    )

  }


  // Remove everything
  const clearWishlist = () => {

    setWishlistItems([])

  }


  const wishlistCount =
    wishlistItems.length


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


// IMPORTANT:
// Shop.jsx and Wishlist.jsx can now import useWishlist
export const useWishlist = () => {

  const context =
    useContext(WishlistContext)


  if (!context) {

    throw new Error(
      'useWishlist must be used inside WishlistProvider'
    )

  }


  return context

}