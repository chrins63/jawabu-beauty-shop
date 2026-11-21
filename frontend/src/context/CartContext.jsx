import { useEffect, useRef, useState } from 'react'
import { loadRemoteCart, saveRemoteCart } from '../lib/accountSync'
import { capQuantity, normalizeStoreProduct } from '../lib/storeProduct'
import { cartLineKey } from '../lib/productOptions'
import { useAuth } from './AuthContext'
import { CartContext, STORAGE_KEY } from './cart-context.js'

function mergeCartLines(localItems, remoteItems) {
  const merged = new Map()

  for (const item of [...remoteItems, ...localItems]) {
    const key = cartLineKey(item)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, item)
      continue
    }

    merged.set(key, {
      ...existing,
      ...item,
      quantity: Math.max(
        Number(existing.quantity) || 0,
        Number(item.quantity) || 0
      ),
    })
  }

  return [...merged.values()]
}

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const [remoteReady, setRemoteReady] = useState(false)
  const cartRef = useRef([])
  const previousUserId = useRef(null)
  const seenAuth = useRef(false)

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

  cartRef.current = cartItems

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

      const remote = await loadRemoteCart(user.id)
      if (cancelled || remote == null) {
        return
      }

      const local = switching ? [] : cartRef.current
      setCartItems(mergeCartLines(local, remote))
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
      saveRemoteCart(user.id, cartItems)
    }, 500)

    return () => window.clearTimeout(handle)
  }, [cartItems, remoteReady, user])

  const addToCart = (product, quantity = 1) => {
    const nextQuantity = capQuantity(quantity, product.stock_quantity)
    if (nextQuantity < 1) {
      return false
    }

    const incoming = {
      ...normalizeStoreProduct(product),
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

        const next = capQuantity(item.quantity + 1, item.stock_quantity)
        if (next < 1) {
          return item
        }

        return {
          ...item,
          quantity: next,
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
