import { useEffect, useState } from 'react'
import { capQuantity, normalizeStoreProduct } from '../lib/storeProduct'
import { cartLineKey } from '../lib/productOptions'
import { CartContext, STORAGE_KEY } from './cart-context.js'

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY)

      return savedCart ? JSON.parse(savedCart) : []
    } catch (error) {
      console.error('Could not load cart:', error)
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cartItems)
      )
    } catch (error) {
      console.error('Could not save cart:', error)
    }
  }, [cartItems])

  const addToCart = (product, quantity = 1) => {
    const incoming = {
      ...normalizeStoreProduct(product),
      quantity: capQuantity(quantity, product.stock_quantity),
    }

    const incomingKey = cartLineKey(incoming)

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => cartLineKey(item) === incomingKey
      )

      if (existingItem) {
        return currentItems.map((item) => {
          if (cartLineKey(item) !== incomingKey) {
            return item
          }

          const stock = incoming.stock_quantity || item.stock_quantity

          return {
            ...item,
            ...incoming,
            quantity: capQuantity(
              item.quantity + incoming.quantity,
              stock
            ),
          }
        })
      }

      return [...currentItems, incoming]
    })
  }

  const removeFromCart = (lineKey) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => cartLineKey(item) !== lineKey
      )
    )
  }

  const increaseQuantity = (lineKey) => {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (cartLineKey(item) !== lineKey) {
          return item
        }

        return {
          ...item,
          quantity: capQuantity(
            item.quantity + 1,
            item.stock_quantity
          ),
        }
      })
    )
  }

  const decreaseQuantity = (lineKey) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          cartLineKey(item) === lineKey
            ? {
                ...item,
                quantity: item.quantity - 1
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  )

  const cartTotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * item.quantity,
    0
  )

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
