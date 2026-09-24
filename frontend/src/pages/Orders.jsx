import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { getRememberedOrderIds } from '../lib/checkout'
import { withOrderItems } from '../lib/customerOrders'
import { useAuth } from '../context/AuthContext'
import OrderReceipt from '../components/OrderReceipt'
import './Account.css'

export default function Orders() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) {
      return
    }

    const loadOrders = async () => {
      setLoading(true)
      setError('')

      const rememberedIds = getRememberedOrderIds()
      const email = (user.email || '').trim()
      const byId = new Map()

      if (email) {
        const { data, error: emailError } = await supabase
          .from('orders')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false })

        if (emailError) {
          console.error('Could not load orders by email:', emailError)
          setError(
            'We could not load your orders. If this keeps happening, ask staff to confirm your checkout email.'
          )
          setOrders([])
          setLoading(false)
          return
        }

        for (const order of data || []) {
          byId.set(order.id, order)
        }
      }

      if (rememberedIds.length > 0) {
        const { data, error: idError } = await supabase
          .from('orders')
          .select('*')
          .in('id', rememberedIds)

        if (idError) {
          console.warn('Could not load remembered orders:', idError)
        } else {
          for (const order of data || []) {
            byId.set(order.id, order)
          }
        }
      }

      const merged = Array.from(byId.values()).sort((a, b) => {
        const aDate = new Date(a.created_at || a.order_date || 0).getTime()
        const bDate = new Date(b.created_at || b.order_date || 0).getTime()
        return bDate - aDate
      })

      setOrders(await withOrderItems(merged))
      setLoading(false)
    }

    loadOrders()
  }, [user])

  const heading = useMemo(() => {
    if (loading) {
      return 'Loading your orders...'
    }

    if (orders.length === 0) {
      return 'No orders yet'
    }

    return `${orders.length} order${orders.length === 1 ? '' : 's'}`
  }, [loading, orders.length])

  if (authLoading || !user) {
    return (
      <main className="account-page account-loading">
        <div className="account-loader">Loading your orders...</div>
      </main>
    )
  }

  return (
    <main className="account-page">
      <section className="account-hero">
        <div className="account-container">
          <Link to="/account" className="checkout-back-link">
            <FiArrowLeft />
            Back to account
          </Link>

          <div className="account-eyebrow">YOUR PURCHASES</div>
          <h1 className="account-title">
            My
            <span> orders</span>
          </h1>
          <p className="account-intro">{heading}</p>
        </div>
      </section>

      <section className="account-content">
        <div className="account-container">
          {error && <p className="account-intro">{error}</p>}

          {loading && (
            <div className="account-loader">Fetching orders...</div>
          )}

          {!loading && orders.length === 0 && (
            <section className="checkout-empty">
              <FiShoppingBag className="checkout-empty-icon" />
              <h2>You have not placed an order yet.</h2>
              <p>
                Orders placed with this email will show up here, including
                guest checkouts that used the same address.
              </p>
              <Link to="/shop" className="btn btn-primary">
                Shop products
              </Link>
            </section>
          )}

          {!loading && orders.length > 0 && (
            <div className="order-receipt-list">
              {orders.map((order) => (
                <OrderReceipt key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
