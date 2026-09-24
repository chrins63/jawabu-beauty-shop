import { useEffect, useRef, useState } from 'react'
import { capQuantity, normalizeStoreProduct } from '../lib/storeProduct'
import { cartLineKey } from '../lib/productOptions'
import { loadRemoteCart, saveRemoteCart } from '../lib/accountSync'
import { useAuth } from './AuthContext'
import { CartContext, STORAGE_KEY } from './cart-context.js'

function mergeCart(localItems, remoteRows) {
  const next = [...localItems]

  for (const row of remoteRows) {
    const normalized = normalizeStoreProduct(row.product)
    const index = next.findIndex(
      (item) => Number(item.id) === Number(normalized.id) && !item.variant_id
    )
    const remoteQty = capQuantity(row.quantity, normalized.stock_quantity)

    if (index >= 0) {
      const existing = next[index]
      const quantity = capQuantity(
        Math.max(Number(existing.quantity) || 0, Number(row.quantity) || 0),
        normalized.stock_quantity
      )
      next[index] = {
        ...existing,
        stock_quantity: normalized.stock_quantity,
        quantity: quantity > 0 ? quantity : existing.quantity,
      }
    } else if (remoteQty > 0) {
      next.push({
        ...normalized,
        quantity: remoteQty,
      })
    }
  }

  return next
}

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const skipSync = useRef(true)
  const cartRef = useRef([])
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY)

      return savedCart ? JSON.parse(savedCart) : []
    } catch (error) {
      console.error('Could not load cart:', error)
      return []
    }
  })

  cartRef.current = cartItems

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

  useEffect(() => {
    let cancelled = false
    skipSync.current = true

    async function hydrate() {
      if (!user?.id) {
        skipSync.current = false
        return
      }

      const remote = await loadRemoteCart(user.id)
      if (cancelled) {
        return
      }

      const merged = mergeCart(cartRef.current, remote)
      setCartItems(merged)
      await saveRemoteCart(user.id, merged)
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
      saveRemoteCart(user.id, cartItems)
    }, 400)

    return () => clearTimeout(handle)
  }, [cartItems, user?.id])

  const addToCart = (product, quantity = 1) => {
    const normalized = normalizeStoreProduct(product)
    const nextQuantity = capQuantity(quantity, normalized.stock_quantity)

    if (nextQuantity <= 0) {
      return false
    }

    const incoming = {
      ...normalized,
      quantity: nextQuantity,
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

          const stock = Number.isFinite(Number(incoming.stock_quantity))
            ? incoming.stock_quantity
            : item.stock_quantity

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

    return true
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

        const nextQuantity = capQuantity(
          item.quantity + 1,
          item.stock_quantity
        )

        if (nextQuantity <= 0) {
          return item
        }

        return {
          ...item,
          quantity: nextQuantity,
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
