import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiPackage, FiSearch } from 'react-icons/fi'

import { formatKes, getRememberedOrders, trackGuestOrder } from '../lib/checkout'
import { getStorefrontCommerce } from '../lib/storefront'
import { BRAND } from '../lib/brand'
import { whatsappHref } from '../lib/whatsapp'
import { isValidKenyanPhone } from '../lib/phone'

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

const TrackOrder = () => {
  const [searchParams] = useSearchParams()
  const remembered = getRememberedOrders()[0]

  const [orderNumber, setOrderNumber] = useState(
    searchParams.get('order') || remembered?.orderNumber || ''
  )
  const [phone, setPhone] = useState(
    searchParams.get('phone') || remembered?.phone || ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [whatsappNumber, setWhatsappNumber] = useState(BRAND.phone)

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setWhatsappNumber(data.whatsapp_number || BRAND.phone)
    })
  }, [])

  async function lookup(ref = orderNumber, tel = phone) {
    setError('')
    setOrder(null)

    if (!String(ref).trim()) {
      setError('Enter your order number.')
      return
    }

    if (!isValidKenyanPhone(tel)) {
      setError('Enter the Kenyan phone number used at checkout.')
      return
    }

    setLoading(true)
    const { data, error: lookupError } = await trackGuestOrder(ref.trim(), tel.trim())
    setLoading(false)

    if (lookupError) {
      setError(lookupError.message || 'Could not look up that order.')
      return
    }

    if (!data?.ok) {
      setError(data?.error || 'No matching order was found.')
      return
    }

    setOrder(data.order)
  }

  useEffect(() => {
    const order = searchParams.get('order')
    const tel = searchParams.get('phone')
    if (order && tel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      lookup(order, tel)
    }
    // Initial URL lookup only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    lookup()
  }

  return (
    <main className="checkout-page">
      <section className="checkout-section track-page">
        <div className="container track-layout">
          <div className="checkout-heading">
            <span className="section-eyebrow">ORDERS</span>
            <h1>Track your order</h1>
            <p>
              Enter the order number from your checkout screen and the phone
              you used. No account needed.
            </p>
          </div>

          <form className="checkout-form track-form" onSubmit={handleSubmit}>
            <div className="checkout-form-grid">
              <div className="checkout-field">
                <label htmlFor="track-order">Order number</label>
                <input
                  id="track-order"
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="SS-000123"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="track-phone">Phone number</label>
                <input
                  id="track-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0712 345 678"
                />
              </div>
            </div>

            {error && <p className="checkout-form-error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FiSearch />
              {loading ? 'Looking up…' : 'Find order'}
            </button>
          </form>

          {order && (
            <article className="track-result">
              <header>
                <FiPackage />
                <div>
                  <strong>{order.order_number}</strong>
                  <p>
                    Placed{' '}
                    {new Date(order.created_at).toLocaleString('en-KE', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </header>

              <div className="track-status-row">
                <span>
                  Payment <strong>{statusLabel(order.payment_status)}</strong>
                </span>
                <span>
                  Order <strong>{statusLabel(order.status)}</strong>
                </span>
              </div>

              <p>
                {order.fulfillment_type === 'pickup'
                  ? 'Collect in Nairobi'
                  : `Delivering to ${order.delivery_address || order.city || 'your address'}`}
              </p>
              {order.fulfillment_type !== 'pickup' &&
                order.delivery_lat != null &&
                order.delivery_lng != null && (
                  <p>
                    <a
                      href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open delivery pin in Google Maps
                    </a>
                  </p>
                )}

              <ul className="track-items">
                {(order.items || []).map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <strong>{formatKes(item.price * item.quantity)}</strong>
                  </li>
                ))}
              </ul>

              <p className="track-total">
                Total <strong>{formatKes(order.total_amount)}</strong>
              </p>

              <a
                className="btn btn-secondary"
                href={whatsappHref(
                  whatsappNumber,
                  `Hello Sleek Sisters, I am checking on order ${order.order_number}.`
                )}
                target="_blank"
                rel="noreferrer"
              >
                Ask about this order on WhatsApp
              </a>
            </article>
          )}

          <p className="checkout-help-note">
            Have an account? <Link to="/orders">View signed-in orders</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default TrackOrder
