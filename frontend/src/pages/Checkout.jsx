import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  FiArrowLeft,
  FiCheck,
  FiShoppingBag
} from 'react-icons/fi'

import { useCart } from '../context/useCart'
import { useAuth } from '../context/AuthContext'
import {
  createCheckoutOrder,
  extractOrderId,
  rememberLocalOrder,
} from '../lib/checkout'

const Checkout = () => {
  const {
    cartItems,
    cartTotal,
    clearCart
  } = useCart()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: ''
  })

  const [orderPlaced, setOrderPlaced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderData, setOrderData] = useState(null)

  useEffect(() => {
    if (!user) {
      return
    }

    const fullName = String(
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      ''
    ).trim()

    const [firstName = '', ...rest] = fullName.split(' ')

    setFormData((current) => ({
      ...current,
      firstName: current.firstName || firstName,
      lastName: current.lastName || rest.join(' '),
      email: current.email || user.email || '',
      phone:
        current.phone ||
        user.user_metadata?.phone ||
        '',
    }))
  }, [user])

  // =========================================================
  // DISPLAY TOTALS
  // =========================================================

  const deliveryFee = cartTotal > 0 ? 300 : 0

  const orderTotal =
    Number(cartTotal) + deliveryFee

  // =========================================================
  // HANDLE INPUT CHANGES
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  // =========================================================
  // HANDLE ORDER SUBMISSION
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    // ---------------------------------------------------------
    // BASIC PHONE VALIDATION
    // ---------------------------------------------------------

    const cleanedPhone =
      formData.phone.replace(/\s+/g, '')

    const validPhone =
      /^(07\d{8}|01\d{8}|\+2547\d{8}|\+2541\d{8})$/.test(
        cleanedPhone
      )

    if (!validPhone) {
      alert(
        'Please enter a valid Kenyan phone number, for example 0712345678.'
      )

      return
    }

    // ---------------------------------------------------------
    // CHECK CART
    // ---------------------------------------------------------

    if (!cartItems || cartItems.length === 0) {
      alert(
        'Your bag is empty. Please add a product before checkout.'
      )

      return
    }

    setIsSubmitting(true)

    try {
      // -------------------------------------------------------
      // PREPARE CART ITEMS FOR SUPABASE
      // -------------------------------------------------------

      const items = cartItems.map((item) => ({
        product_id: Number(item.id),
        quantity: Number(item.quantity)
      }))

      const {
        data,
        error
      } = await createCheckoutOrder({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: cleanedPhone,
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        items,
        deliveryFee,
      })

      // -------------------------------------------------------
      // HANDLE SUPABASE ERROR
      // -------------------------------------------------------

      if (error) {
        console.error(
          'CHECKOUT SUPABASE ERROR:',
          error
        )

        alert(
          `Could not place your order.\n\n${error.message}`
        )

        return
      }

      // -------------------------------------------------------
      // SUCCESS
      // -------------------------------------------------------

      console.log(
        'ORDER CREATED SUCCESSFULLY:',
        data
      )

      setOrderData(data)
      rememberLocalOrder(
        extractOrderId(data),
        formData.email.trim()
      )

      // Empty the local cart only after
      // Supabase successfully created the order.
      clearCart()

      setOrderPlaced(true)

    } catch (error) {
      // -------------------------------------------------------
      // UNEXPECTED ERROR
      // -------------------------------------------------------

      console.error(
        'CHECKOUT UNEXPECTED ERROR:',
        error
      )

      alert(
        'Something went wrong while placing your order. Please try again.'
      )

    } finally {
      setIsSubmitting(false)
    }
  }

  // =========================================================
  // EMPTY CART
  // =========================================================

  if (
    cartItems.length === 0 &&
    !orderPlaced
  ) {
    return (
      <main className="checkout-page">

        <section className="checkout-empty">

          <div className="container">

            <FiShoppingBag
              className="checkout-empty-icon"
            />

            <span className="section-eyebrow">
              CHECKOUT
            </span>

            <h1>
              Your bag is empty.
            </h1>

            <p>
              Add something beautiful to your bag
              before continuing to checkout.
            </p>

            <Link
              to="/shop"
              className="btn btn-primary"
            >
              Shop Products
            </Link>

          </div>

        </section>

      </main>
    )
  }

  // =========================================================
  // ORDER SUCCESS
  // =========================================================

  if (orderPlaced) {
    return (
      <main className="checkout-page">

        <section className="checkout-success">

          <div className="container">

            <div className="checkout-success-icon">
              <FiCheck />
            </div>

            <span className="section-eyebrow">
              JAWABU BEAUTY
            </span>

            <h1>
              Order received.
            </h1>

            <p>
              Thank you, {formData.firstName}.
              Your order has been successfully recorded.
            </p>

            {/* ORDER NUMBER */}

            {orderData?.order_id && (
              <p>
                <strong>
                  Order #{orderData.order_id}
                </strong>
              </p>
            )}

            {/* ORDER TOTAL */}

            {orderData?.total !== undefined && (
              <p>
                Total:{' '}
                <strong>
                  KSh{' '}
                  {Number(
                    orderData.total
                  ).toLocaleString()}
                </strong>
              </p>
            )}

            <Link
              to="/orders"
              className="btn btn-primary"
            >
              View my orders
            </Link>

          </div>

        </section>

      </main>
    )
  }

  // =========================================================
  // CHECKOUT PAGE
  // =========================================================

  return (
    <main className="checkout-page">

      <section className="checkout-section">

        <div className="container">

          {/* BACK TO CART */}

          <Link
            to="/cart"
            className="checkout-back-link"
          >
            <FiArrowLeft />
            Back to Cart
          </Link>


          {/* HEADER */}

          <div className="checkout-heading">

            <span className="section-eyebrow">
              CHECKOUT
            </span>

            <h1>
              Complete Your Order
            </h1>

            <p>
              Enter your details so we can prepare
              your Jawabu order.
            </p>

          </div>


          <div className="checkout-layout">

            {/* =================================================
                CUSTOMER FORM
            ================================================= */}

            <form
              className="checkout-form"
              onSubmit={handleSubmit}
            >

              {/* CONTACT DETAILS */}

              <div className="checkout-form-section">

                <span className="checkout-form-label">
                  01 — CONTACT DETAILS
                </span>

                <h2>
                  Your Information
                </h2>

                <div className="checkout-form-grid">

                  {/* FIRST NAME */}

                  <div className="checkout-field">

                    <label htmlFor="firstName">
                      First Name
                    </label>

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


                  {/* LAST NAME */}

                  <div className="checkout-field">

                    <label htmlFor="lastName">
                      Last Name
                    </label>

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


                  {/* PHONE */}

                  <div className="checkout-field">

                    <label htmlFor="phone">
                      Phone Number
                    </label>

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

                    <small>
                      Kenyan mobile number
                    </small>

                  </div>


                  {/* EMAIL */}

                  <div className="checkout-field">

                    <label htmlFor="email">
                      Email Address
                    </label>

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


              {/* =================================================
                  DELIVERY
              ================================================= */}

              <div className="checkout-form-section">

                <span className="checkout-form-label">
                  02 — DELIVERY
                </span>

                <h2>
                  Delivery Information
                </h2>


                {/* ADDRESS */}

                <div className="checkout-field">

                  <label htmlFor="address">
                    Delivery Address
                  </label>

                  <textarea
                    id="address"
                    name="address"
                    rows="4"
                    placeholder="Enter your delivery address"
                    value={formData.address}
                    onChange={handleChange}
                    minLength={5}
                    required
                    disabled={isSubmitting}
                  />

                </div>


                {/* CITY */}

                <div className="checkout-field">

                  <label htmlFor="city">
                    City / Town
                  </label>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="e.g. Nairobi"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />

                </div>

              </div>


              {/* =================================================
                  PAYMENT
              ================================================= */}

              <div className="checkout-form-section">

                <span className="checkout-form-label">
                  03 — PAYMENT
                </span>

                <h2>
                  Payment Method
                </h2>


                <div className="checkout-payment-option">

                  <div className="checkout-payment-icon">
                    M
                  </div>

                  <div>

                    <strong>
                      M-Pesa
                    </strong>

                    <p>
                      Mobile payment
                    </p>

                  </div>

                  <FiCheck />

                </div>


                <p className="checkout-payment-note">
                  Your order will be recorded as
                  payment pending. M-Pesa payment
                  processing can be connected next.
                </p>

              </div>


              {/* SUBMIT */}

              <button
                type="submit"
                className="btn btn-primary checkout-submit"
                disabled={isSubmitting}
              >

                {isSubmitting
                  ? 'Processing Order...'
                  : 'Place Order'}

              </button>

            </form>


            {/* =================================================
                ORDER SUMMARY
            ================================================= */}

            <aside className="checkout-summary">

              <span className="section-eyebrow">
                YOUR ORDER
              </span>

              <h2>
                Order Summary
              </h2>


              {/* PRODUCTS */}

              <div className="checkout-items">

                {cartItems.map((item) => (

                  <div
                    className="checkout-item"
                    key={item.id}
                  >

                    <div className="checkout-item-image">

                      <img
                        src={item.image}
                        alt={item.name}
                      />

                    </div>


                    <div className="checkout-item-info">

                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        Qty: {item.quantity}
                      </span>

                    </div>


                    <strong>
                      KSh {(
                        Number(item.price) *
                        Number(item.quantity)
                      ).toLocaleString()}
                    </strong>

                  </div>

                ))}

              </div>


              <div className="checkout-summary-divider" />


              {/* SUBTOTAL */}

              <div className="checkout-summary-row">

                <span>
                  Subtotal
                </span>

                <strong>
                  KSh{' '}
                  {Number(
                    cartTotal
                  ).toLocaleString()}
                </strong>

              </div>


              {/* DELIVERY */}

              <div className="checkout-summary-row">

                <span>
                  Delivery
                </span>

                <strong>
                  KSh{' '}
                  {deliveryFee.toLocaleString()}
                </strong>

              </div>


              <div className="checkout-summary-divider" />


              {/* TOTAL */}

              <div className="checkout-summary-total">

                <span>
                  Total
                </span>

                <strong>
                  KSh{' '}
                  {orderTotal.toLocaleString()}
                </strong>

              </div>

            </aside>

          </div>

        </div>

      </section>

    </main>
  )
}

export default Checkout