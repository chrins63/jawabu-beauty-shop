import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiHeart,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiPackage,
  FiShoppingBag,
  FiUser,
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { getRememberedOrderIds } from '../lib/checkout'
import { isValidKenyanPhone } from '../lib/phone'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/useWishlist'
import { BRAND } from '../lib/brand'
import { whatsappHref, defaultWhatsAppText } from '../lib/whatsapp'
import './Account.css'

function formatMoney(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusLabel(value) {
  const key = String(value || '').toLowerCase()
  if (key === 'paid' || key === 'completed' || key === 'success') return 'Paid'
  if (key === 'processing') return 'Being prepared'
  if (key === 'shipped' || key === 'dispatched') return 'On the way'
  if (key === 'delivered') return 'Delivered'
  if (key === 'cancelled') return 'Cancelled'
  if (key === 'pending') return 'Pending'
  return value || 'Pending'
}

export default function Account() {
  const navigate = useNavigate()
  const { user, loading: authLoading, logout } = useAuth()
  const { wishlistItems } = useWishlist()

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) return

    setFullName(
      user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        ''
    )
    setPhone(user.user_metadata?.phone || '')
    setCity(user.user_metadata?.city || '')
    setAddress(user.user_metadata?.address || '')
  }, [user])

  useEffect(() => {
    if (!user) return

    const loadOrders = async () => {
      setOrdersLoading(true)
      const rememberedIds = getRememberedOrderIds()
      const email = (user.email || '').trim()
      const byId = new Map()

      if (email) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) {
          console.error('Could not load account orders:', error)
        } else {
          for (const order of data || []) {
            byId.set(order.id, order)
          }
        }
      }

      if (rememberedIds.length > 0) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .in('id', rememberedIds)

        for (const order of data || []) {
          byId.set(order.id, order)
        }
      }

      const merged = Array.from(byId.values()).sort((a, b) => {
        return (
          new Date(b.created_at || b.order_date || 0).getTime() -
          new Date(a.created_at || a.order_date || 0).getTime()
        )
      })

      setOrders(merged)
      setOrdersLoading(false)
    }

    loadOrders()
  }, [user])

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setSaveMessage('')
    setSaveError('')

    const name = fullName.trim()
    if (!name) {
      setSaveError('Please enter your name.')
      return
    }

    if (phone.trim() && !isValidKenyanPhone(phone)) {
      setSaveError('Enter a valid Kenyan phone number, or leave it blank.')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
      },
    })
    setSaving(false)

    if (error) {
      setSaveError(error.message || 'Could not save your details.')
      return
    }

    setSaveMessage('Your details have been saved.')
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await logout()
    if (error) {
      setSigningOut(false)
      return
    }
    navigate('/', { replace: true })
  }

  if (authLoading || !user) {
    return (
      <main className="account-page account-loading">
        <div className="account-loader">Opening your account...</div>
      </main>
    )
  }

  const displayName =
    fullName ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'there'
  const firstName = displayName.split(' ')[0]
  const recentOrders = orders.slice(0, 3)
  const wishlistCount = wishlistItems.length

  return (
    <main className="account-page">
      <section className="account-hero">
        <div className="account-container">
          <span className="account-eyebrow">My account</span>
          <h1 className="account-title">
            Hello, <em>{firstName}.</em>
          </h1>
          <p className="account-intro">
            Track a delivery, review past orders, or update the details we use
            to pack and send your Sleek Sisters order.
          </p>
        </div>
      </section>

      <section className="account-content">
        <div className="account-container">
          <div className="account-shortcuts">
            <Link to="/orders" className="account-shortcut">
              <FiPackage />
              <strong>My orders</strong>
              <span>
                {ordersLoading
                  ? 'Loading...'
                  : orders.length
                    ? `${orders.length} on file`
                    : 'No orders yet'}
              </span>
            </Link>
            <Link to="/track" className="account-shortcut">
              <FiMapPin />
              <strong>Track order</strong>
              <span>Find a delivery with your order number</span>
            </Link>
            <Link to="/wishlist" className="account-shortcut">
              <FiHeart />
              <strong>Wishlist</strong>
              <span>
                {wishlistCount
                  ? `${wishlistCount} saved`
                  : 'Save products for later'}
              </span>
            </Link>
            <Link to="/shop" className="account-shortcut">
              <FiShoppingBag />
              <strong>Shop again</strong>
              <span>Browse the collection</span>
            </Link>
          </div>

          <section className="account-panel">
            <div className="account-panel-heading">
              <div>
                <span className="account-eyebrow">Recent orders</span>
                <h2>What you bought</h2>
              </div>
              <Link to="/orders" className="account-panel-link">
                View all orders
              </Link>
            </div>

            {ordersLoading && (
              <div className="account-loader">Fetching orders...</div>
            )}

            {!ordersLoading && recentOrders.length === 0 && (
              <div className="account-empty">
                <FiShoppingBag />
                <h3>No orders yet</h3>
                <p>
                  When you check out with this email, your purchases will show
                  up here.
                </p>
                <Link to="/shop" className="btn btn-primary">
                  Shop products
                </Link>
              </div>
            )}

            {!ordersLoading && recentOrders.length > 0 && (
              <div className="account-orders-list">
                {recentOrders.map((order) => {
                  const trackTo =
                    order.order_number && order.phone
                      ? `/track?order=${encodeURIComponent(order.order_number)}&phone=${encodeURIComponent(order.phone)}`
                      : '/track'

                  return (
                    <article className="account-order-card" key={order.id}>
                      <div>
                        <span className="account-order-id">
                          {order.order_number || `Order #${order.id}`}
                        </span>
                        <p className="account-order-meta">
                          {formatDate(order.created_at || order.order_date)}
                        </p>
                      </div>
                      <div className="account-order-status">
                        {statusLabel(order.payment_status)} ·{' '}
                        {statusLabel(order.status)}
                      </div>
                      <strong>
                        {formatMoney(order.total_amount ?? order.total)}
                      </strong>
                      <Link to={trackTo} className="account-order-track">
                        Track
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="account-panel">
            <div className="account-panel-heading">
              <div>
                <span className="account-eyebrow">Profile</span>
                <h2>Your details</h2>
              </div>
            </div>

            <form className="account-profile-form" onSubmit={handleSaveProfile}>
              <div className="account-profile-grid">
                <label className="account-field">
                  <span>
                    <FiUser /> Name
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="account-field">
                  <span>
                    <FiMail /> Email
                  </span>
                  <input type="email" value={user.email || ''} disabled />
                </label>

                <label className="account-field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0712 345 678"
                    autoComplete="tel"
                  />
                </label>

                <label className="account-field">
                  <span>City / Town</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Nairobi"
                    autoComplete="address-level2"
                  />
                </label>

                <label className="account-field account-field-wide">
                  <span>Delivery address</span>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Estate, street, building, landmark"
                    autoComplete="street-address"
                  />
                </label>
              </div>

              {saveError && <p className="account-form-error">{saveError}</p>}
              {saveMessage && (
                <p className="account-form-success">{saveMessage}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save details'}
              </button>
            </form>
          </section>

          <div className="account-footer">
            <div className="account-footer-copy">
              <span>{BRAND.name.toUpperCase()}</span>
              <p>
                Need a hand?{' '}
                <a
                  href={whatsappHref(BRAND.phone, defaultWhatsAppText())}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp us
                </a>{' '}
                or <Link to="/contact">send a message</Link>.
              </p>
            </div>

            <button
              type="button"
              className="account-signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <FiLogOut />
              <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
