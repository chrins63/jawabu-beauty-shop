import { Link } from 'react-router-dom'

import {
  FiArrowLeft,
  FiMinus,
  FiPlus,
  FiTrash2,
  FiShoppingBag
} from 'react-icons/fi'

import { useCart } from '../context/useCart.jsx'

const Cart = () => {
  const {
    cartItems,
    cartTotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart
  } = useCart()

  // =====================================================
  // EMPTY CART
  // =====================================================

  if (cartItems.length === 0) {
    return (
      <main className="cart-page">

        <section className="cart-empty">

          <div className="container">

            <FiShoppingBag className="cart-empty-icon" />

            <span className="section-eyebrow">
              YOUR BAG
            </span>

            <h1>
              Your bag is empty.
            </h1>

            <p>
              Discover something beautiful from the
              Sleek Sisters collection.
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

  // =====================================================
  // CART
  // =====================================================

  return (
    <main className="cart-page">

      <section className="cart-section">

        <div className="container">

          {/* BACK TO SHOP */}

          <Link
            to="/shop"
            className="cart-back-link"
          >
            <FiArrowLeft />
            Continue Shopping
          </Link>


          {/* HEADING */}

          <div className="cart-heading">

            <span className="section-eyebrow">
              YOUR BAG
            </span>

            <h1>
              Shopping Bag
            </h1>

          </div>


          <div className="cart-layout">

            {/* =================================================
                CART ITEMS
            ================================================= */}

            <div className="cart-items">

              {cartItems.map((item) => (

                <article
                  className="cart-item"
                  key={item.cartKey || `${item.id}:${item.variant_id || 0}`}
                >

                  {/* IMAGE */}

                  <div className="cart-item-image">

                    <img
                      src={item.image}
                      alt={item.name}
                    />

                  </div>


                  {/* INFORMATION */}

                  <div className="cart-item-info">

                    <span>
                      {item.category || 'Beauty'}
                    </span>

                    <h2>
                      {item.name}
                    </h2>

                    {item.variant_label ? (
                      <p className="cart-item-option">
                        {item.option_type === 'size' ? 'Size' : 'Colour'}: {item.variant_label}
                      </p>
                    ) : null}

                    <strong>
                      KSh {Number(item.price).toLocaleString()}
                    </strong>


                    {/* ACTIONS */}

                    <div className="cart-item-actions">

                      {/* QUANTITY */}

                      <div className="quantity-control">

                        {/* MINUS */}

                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(item.cartKey || `${item.id}:${item.variant_id || 0}`)
                          }
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <FiMinus />
                        </button>


                        {/* NUMBER */}

                        <strong>
                          {item.quantity}
                        </strong>


                        {/* PLUS */}

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(item.cartKey || `${item.id}:${item.variant_id || 0}`)
                          }
                          disabled={
                            Number(item.stock_quantity) > 0 &&
                            item.quantity >= item.stock_quantity
                          }
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <FiPlus />
                        </button>

                      </div>


                      {/* REMOVE */}

                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() =>
                          removeFromCart(item.cartKey || `${item.id}:${item.variant_id || 0}`)
                        }
                      >
                        <FiTrash2 />
                        Remove
                      </button>

                    </div>

                  </div>


                  {/* ITEM TOTAL */}

                  <div className="cart-item-total">

                    KSh {(
                      Number(item.price) * item.quantity
                    ).toLocaleString()}

                  </div>

                </article>

              ))}

            </div>


            {/* =================================================
                ORDER SUMMARY
            ================================================= */}

            <aside className="cart-summary">

              <span className="section-eyebrow">
                ORDER SUMMARY
              </span>

              <h2>
                Your Order
              </h2>


              {/* SUBTOTAL */}

              <div className="cart-summary-row">

                <span>
                  Subtotal
                </span>

                <strong>
                  KSh {cartTotal.toLocaleString()}
                </strong>

              </div>


              {/* DELIVERY */}

              <div className="cart-summary-row">

                <span>
                  Delivery
                </span>

                <span>
                  Calculated at checkout
                </span>

              </div>


              <div className="cart-summary-divider" />


              {/* TOTAL */}

              <div className="cart-summary-total">

                <span>
                  Total
                </span>

                <strong>
                  KSh {cartTotal.toLocaleString()}
                </strong>

              </div>


              {/* CHECKOUT */}

              <Link
                  to="/checkout"
                 className="btn btn-primary checkout-btn"
             >
                  Proceed to Checkout
              </Link>


              <p className="cart-note">
                Delivery is chosen at checkout — Nairobi from KSh 200, or free
                Nairobi pickup.
              </p>

            </aside>

          </div>

        </div>

      </section>

    </main>
  )
}

export default Cart