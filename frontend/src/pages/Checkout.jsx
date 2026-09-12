import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCheck,
  FiMapPin,
  FiShoppingBag,
} from 'react-icons/fi'

import { useCart } from '../context/useCart'
import { useAuth } from '../context/AuthContext'
import {
  createCheckoutOrder,
  extractOrderId,
  formatKes,
  getCheckoutPaymentStatus,
  rememberLocalOrder,
  requestMpesaStk,
} from '../lib/checkout'
import { subscribeToSms } from '../lib/sms'
import { subscribeToEmail } from '../lib/email'
import { supabase } from '../lib/supabase'
import { getStorefrontCommerce } from '../lib/storefront'
import { isValidKenyanPhone } from '../lib/phone'
import { whatsappHref } from '../lib/whatsapp'
import { BRAND } from '../lib/brand'
import DeliveryLocationPicker from '../components/DeliveryLocationPicker'

function LipaDetails({ mpesa, orderNumber, total, whatsappNumber, firstName }) {
  const hasTill = Boolean(mpesa?.till)
  const hasPaybill = Boolean(mpesa?.paybill)

  return (
    <div className="checkout-lipa">
      <h3>Lipa Na M-Pesa</h3>
      <p>
        Pay <strong>{formatKes(total)}</strong> using the details below.
        Use your order number as the account reference.
      </p>

      <dl>
        {hasTill && (
          <>
            <dt>Till number</dt>
            <dd>{mpesa.till}</dd>
          </>
        )}
        {hasPaybill && (
          <>
            <dt>Paybill</dt>
            <dd>{mpesa.paybill}</dd>
          </>
        )}
        <dt>Account / reference</dt>
        <dd>{orderNumber}</dd>
        <dt>Amount</dt>
        <dd>{formatKes(total)}</dd>
        {mpesa?.account_name && (
          <>
            <dt>Name</dt>
            <dd>{mpesa.account_name}</dd>
          </>
        )}
      </dl>

      {!hasTill && !hasPaybill && (
        <p>
          Till and paybill numbers will appear here once staff save them in
          Admin → Payments. You can still send a payment screenshot on WhatsApp.
        </p>
      )}

      <a
        className="btn btn-secondary"
        href={whatsappHref(
          whatsappNumber,
          `Hello Sleek Sisters, I have placed order ${orderNumber} for ${formatKes(total)}. My name is ${firstName}.`
        )}
        target="_blank"
        rel="noreferrer"
      >
        Send payment proof on WhatsApp
      </a>
    </div>
  )
}

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    addressNote: '',
    lat: null,
    lng: null,
    giftMessage: '',
    mpesaPhone: '',
    deliveryOptionId: '',
  })

  const [commerce, setCommerce] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [smsOptIn, setSmsOptIn] = useState(true)
  const [formError, setFormError] = useState('')
  const [payMessage, setPayMessage] = useState('')
  const [stkBusy, setStkBusy] = useState(false)

  const deliveryOptions = commerce?.delivery_options || []
  const selectedOption = deliveryOptions.find(
    (option) => String(option.id) === String(formData.deliveryOptionId)
  )
  const needsAddress = selectedOption?.requires_address !== false
  const deliveryFee = Number(selectedOption?.fee || 0)
  const orderTotal = Number(cartTotal) + deliveryFee
  const whatsappNumber = commerce?.whatsapp_number || BRAND.phone
  const mpesa = commerce?.mpesa || {}

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setCommerce(data)
      setFormData((current) => {
        if (current.deliveryOptionId || !data.delivery_options?.length) {
          return current
        }

        const preferred =
          data.delivery_options.find((option) => option.slug === 'nairobi_estate') ||
          data.delivery_options[0]

        return {
          ...current,
          deliveryOptionId: String(preferred.id),
        }
      })
    })
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    const fullName = String(
      user.user_metadata?.full_name || user.user_metadata?.name || ''
    ).trim()
    const [firstName = '', ...rest] = fullName.split(' ')

    // Prefill checkout from the signed-in customer once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((current) => ({
      ...current,
      firstName: current.firstName || firstName,
      lastName: current.lastName || rest.join(' '),
      email: current.email || user.email || '',
      phone: current.phone || user.user_metadata?.phone || '',
      mpesaPhone: current.mpesaPhone || user.user_metadata?.phone || '',
      address: current.address || user.user_metadata?.address || '',
      city: current.city || user.user_metadata?.city || '',
      lat: current.lat || user.user_metadata?.delivery_lat || null,
      lng: current.lng || user.user_metadata?.delivery_lng || null,
    }))
  }, [user])

  useEffect(() => {
    if (!orderPlaced || !orderData?.order_id || !orderData?.phone) {
      return undefined
    }

    let cancelled = false
    const poll = async () => {
      const { data } = await getCheckoutPaymentStatus(
        orderData.order_id,
        orderData.phone
      )

      if (cancelled || !data?.ok) {
        return
      }

      if (String(data.payment_status).toLowerCase() === 'paid') {
        setOrderData((current) =>
          current
            ? {
                ...current,
                payment_status: 'paid',
                receipt: data.receipt,
              }
            : current
        )
      } else if (data.result_desc) {
        setPayMessage(data.result_desc)
      }
    }

    poll()
    const timer = window.setInterval(poll, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [orderPlaced, orderData?.order_id, orderData?.phone])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'phone' && !current.mpesaPhone ? { mpesaPhone: value } : {}),
    }))
  }

  const startStk = async (orderId, contactPhone, mpesaPhone) => {
    setStkBusy(true)
    setPayMessage('Sending the M-Pesa prompt to your phone…')

    const { data, error } = await requestMpesaStk({
      orderId,
      contactPhone,
      mpesaPhone,
    })

    setStkBusy(false)

    if (data?.already_paid) {
      setOrderData((current) =>
        current ? { ...current, payment_status: 'paid' } : current
      )
      setPayMessage('Payment received. Thank you.')
      return
    }

    if (error || data?.ok === false) {
      setPayMessage(
        data?.error ||
          error?.message ||
          'The prompt could not be sent. Use Lipa Na M-Pesa below.'
      )
      return
    }

    setPayMessage(
      data?.customer_message ||
        'Check your phone and enter your M-Pesa PIN to complete payment.'
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setFormError('')

    if (!selectedOption) {
      setFormError('Please choose how you would like to receive your order.')
      return
    }

    if (!isValidKenyanPhone(formData.phone)) {
      setFormError('Enter a valid Kenyan phone number, for example 0712 345 678.')
      return
    }

    const payPhone = formData.mpesaPhone.trim() || formData.phone
    if (!isValidKenyanPhone(payPhone)) {
      setFormError('Enter a valid M-Pesa number.')
      return
    }

    if (needsAddress && (formData.lat == null || formData.lng == null)) {
      setFormError('Drop a pin on the map so we know where to deliver.')
      return
    }

    if (needsAddress && (!formData.address.trim() || !formData.city.trim())) {
      setFormError('Choose your delivery location on the map.')
      return
    }

    if (!cartItems?.length) {
      setFormError('Your bag is empty.')
      return
    }

    setIsSubmitting(true)

    try {
      const items = cartItems.map((item) => ({
        product_id: Number(item.id),
        quantity: Number(item.quantity),
        variant_id: item.variant_id ? Number(item.variant_id) : null,
      }))

      const { data, error } = await createCheckoutOrder({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        deliveryOptionId: selectedOption.id,
        address: [formData.address.trim(), formData.addressNote.trim()]
          .filter(Boolean)
          .join('. '),
        city: formData.city.trim(),
        items,
        giftMessage: formData.giftMessage.trim(),
        lat: formData.lat,
        lng: formData.lng,
      })

      if (error) {
        setFormError(error.message || 'Could not place your order.')
        return
      }

      const orderId = extractOrderId(data)
      const placed = {
        order_id: orderId,
        order_number: data?.order_number || `SS-${orderId}`,
        total: Number(data?.total ?? orderTotal),
        delivery_name: data?.delivery_name || selectedOption.name,
        payment_status: data?.payment_status || 'pending',
        phone: formData.phone.trim(),
        mpesaPhone: payPhone,
      }

      setOrderData(placed)
      rememberLocalOrder({
        orderId,
        orderNumber: placed.order_number,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      })

      if (smsOptIn) {
        const customerName =
          `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
        await subscribeToSms({
          supabase,
          phone: formData.phone.trim(),
          name: customerName,
          source: 'checkout',
        })
        await subscribeToEmail({
          supabase,
          email: formData.email.trim(),
          name: customerName,
          source: 'checkout',
        })
      }

      clearCart()
      setOrderPlaced(true)

      if (mpesa.stk_ready) {
        await startStk(orderId, formData.phone.trim(), payPhone)
      } else {
        setPayMessage(
          'Your order is saved. Complete Lipa Na M-Pesa using the details below.'
        )
      }
    } catch (error) {
      console.error('CHECKOUT UNEXPECTED ERROR:', error)
      setFormError('Something went wrong while placing your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const paid = String(orderData?.payment_status || '').toLowerCase() === 'paid'

  const pickupCopy = useMemo(() => {
    if (!selectedOption || selectedOption.requires_address) {
      return ''
    }
    return commerce?.pickup_address || 'Nairobi'
  }, [selectedOption, commerce])

  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <div className="container">
            <FiShoppingBag className="checkout-empty-icon" />
            <span className="section-eyebrow">CHECKOUT</span>
            <h1>Your bag is empty.</h1>
            <p>Add something beautiful to your bag before continuing to checkout.</p>
            <Link to="/shop" className="btn btn-primary">
              Shop Products
            </Link>
          </div>
        </section>
      </main>
    )
  }

  if (orderPlaced) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <div className="container checkout-success-wrap">
            <div className={`checkout-success-icon${paid ? '' : ' is-pending'}`}>
              <FiCheck />
            </div>

            <span className="section-eyebrow">SLEEK SISTERS</span>
            <h1>{paid ? 'Payment received.' : 'Order placed.'}</h1>
            <p>
              {paid
                ? `Thank you, ${formData.firstName}. We will prepare your order shortly.`
                : `Thank you, ${formData.firstName}. Complete M-Pesa to confirm your order.`}
            </p>

            {orderData?.order_number && (
              <p className="checkout-order-ref">
                Order <strong>{orderData.order_number}</strong>
              </p>
            )}

            <p>
              Total <strong>{formatKes(orderData?.total)}</strong>
              {orderData?.delivery_name ? ` · ${orderData.delivery_name}` : ''}
            </p>

            {payMessage && <p className="checkout-pay-status">{payMessage}</p>}

            {!paid && (
              <>
                {mpesa.stk_ready && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={stkBusy}
                    onClick={() =>
                      startStk(
                        orderData.order_id,
                        orderData.phone,
                        orderData.mpesaPhone
                      )
                    }
                  >
                    {stkBusy ? 'Sending prompt…' : 'Send M-Pesa prompt again'}
                  </button>
                )}

                <LipaDetails
                  mpesa={mpesa}
                  orderNumber={orderData?.order_number}
                  total={orderData?.total}
                  whatsappNumber={whatsappNumber}
                  firstName={formData.firstName}
                />
              </>
            )}

            <div className="checkout-success-actions">
              <Link
                to={`/track?order=${encodeURIComponent(orderData?.order_number || '')}&phone=${encodeURIComponent(orderData?.phone || '')}`}
                className="btn btn-primary"
              >
                Track this order
              </Link>
              <Link to="/shop" className="btn btn-secondary">
                Continue shopping
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <Link to="/cart" className="checkout-back-link">
            <FiArrowLeft />
            Back to Cart
          </Link>

          <div className="checkout-heading">
            <span className="section-eyebrow">CHECKOUT</span>
            <h1>Complete Your Order</h1>
            <p>
              Choose delivery, pay with M-Pesa, and we will pack your Sleek Sisters
              order with care.
            </p>
          </div>

          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={handleSubmit}>
              <div className="checkout-form-section">
                <span className="checkout-form-label">01 — CONTACT</span>
                <h2>Your Information</h2>

                <div className="checkout-form-grid">
                  <div className="checkout-field">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleChange}
                      minLength={2}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      minLength={2}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    />
                    <small>We will use this to update you and to track your order.</small>
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="checkout-form-section">
                <span className="checkout-form-label">02 — DELIVERY</span>
                <h2>How should we send it?</h2>

                <div className="checkout-delivery-grid">
                  {deliveryOptions.map((option) => {
                    const selected =
                      String(formData.deliveryOptionId) === String(option.id)

                    return (
                      <label
                        key={option.id}
                        className={`checkout-delivery-card${
                          selected ? ' is-selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryOptionId"
                          value={option.id}
                          checked={selected}
                          onChange={handleChange}
                          disabled={isSubmitting}
                        />
                        <span className="checkout-delivery-card-top">
                          <strong>{option.name}</strong>
                          <em>
                            {Number(option.fee) === 0
                              ? 'Free'
                              : formatKes(option.fee)}
                          </em>
                        </span>
                        <span>{option.description}</span>
                        {option.eta && (
                          <small>
                            <FiMapPin /> {option.eta}
                          </small>
                        )}
                      </label>
                    )
                  })}
                </div>

                {needsAddress ? (
                  <>
                    <DeliveryLocationPicker
                      value={{
                        lat: formData.lat,
                        lng: formData.lng,
                        address: formData.address,
                        city: formData.city,
                      }}
                      onChange={(place) =>
                        setFormData((current) => ({
                          ...current,
                          lat: place.lat,
                          lng: place.lng,
                          address: place.address || current.address,
                          city: place.city || current.city,
                        }))
                      }
                      disabled={isSubmitting}
                    />

                    <div className="checkout-field">
                      <label htmlFor="addressNote">
                        Apartment, house or gate (optional)
                      </label>
                      <input
                        id="addressNote"
                        name="addressNote"
                        type="text"
                        placeholder="e.g. Court B, house 12, red gate"
                        value={formData.addressNote}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                ) : (
                  <p className="checkout-pickup-note">
                    Pickup: {pickupCopy}
                  </p>
                )}

                <div className="checkout-field">
                  <label htmlFor="giftMessage">Gift note (optional)</label>
                  <textarea
                    id="giftMessage"
                    name="giftMessage"
                    rows="3"
                    placeholder="A short note if this is a gift"
                    value={formData.giftMessage}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="checkout-form-section">
                <span className="checkout-form-label">03 — PAYMENT</span>
                <h2>M-Pesa</h2>

                <div className="checkout-payment-option">
                  <div className="checkout-payment-icon">M</div>
                  <div>
                    <strong>Lipa Na M-Pesa</strong>
                    <p>
                      {mpesa.stk_ready
                        ? 'A prompt will be sent to your phone after you place the order.'
                        : 'You will receive till or paybill details after placing the order.'}
                    </p>
                  </div>
                  <FiCheck />
                </div>

                <div className="checkout-field">
                  <label htmlFor="mpesaPhone">M-Pesa number</label>
                  <input
                    id="mpesaPhone"
                    name="mpesaPhone"
                    type="tel"
                    placeholder="Same as your phone, or another Safaricom number"
                    value={formData.mpesaPhone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>

                <label className="checkout-sms-optin">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(event) => setSmsOptIn(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>
                    Text me and email me when Sleek Sisters adds new products.
                  </span>
                </label>
              </div>

              {formError && <p className="checkout-form-error">{formError}</p>}

              <button
                type="submit"
                className="btn btn-primary checkout-submit"
                disabled={isSubmitting || !selectedOption}
              >
                {isSubmitting
                  ? 'Placing order…'
                  : `Place order · ${formatKes(orderTotal)}`}
              </button>

              <p className="checkout-help-note">
                Need a hand?{' '}
                <a
                  href={whatsappHref(
                    whatsappNumber,
                    'Hello Sleek Sisters, I need help with checkout.'
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp us
                </a>
                .
              </p>
            </form>

            <aside className="checkout-summary">
              <span className="section-eyebrow">YOUR ORDER</span>
              <h2>Order Summary</h2>

              <div className="checkout-items">
                {cartItems.map((item) => (
                  <div className="checkout-item" key={item.cartKey || `${item.id}:${item.variant_id || 0}`}>
                    <div className="checkout-item-image">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="checkout-item-info">
                      <strong>{item.name}</strong>
                      <span>
                        Qty: {item.quantity}
                        {item.variant_label
                          ? ` · ${item.option_type === 'size' ? 'Size' : 'Colour'}: ${item.variant_label}`
                          : ''}
                      </span>
                    </div>
                    <strong>
                      {formatKes(Number(item.price) * Number(item.quantity))}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="checkout-summary-divider" />

              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <strong>{formatKes(cartTotal)}</strong>
              </div>

              <div className="checkout-summary-row">
                <span>{selectedOption?.name || 'Delivery'}</span>
                <strong>
                  {deliveryFee === 0 ? 'Free' : formatKes(deliveryFee)}
                </strong>
              </div>

              <div className="checkout-summary-divider" />

              <div className="checkout-summary-total">
                <span>Total</span>
                <strong>{formatKes(orderTotal)}</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Checkout
