import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import {
  FiHeart,
  FiTrash2,
  FiShoppingBag,
  FiArrowRight,
  FiCheck
} from 'react-icons/fi'

import { useWishlist } from '../context/useWishlist'
import { useCart } from '../context/useCart'

const Wishlist = () => {
  const navigate = useNavigate()
  const {
    wishlistItems,
    removeFromWishlist
  } = useWishlist()

  const { addToCart } = useCart()

  const [addedProductId, setAddedProductId] = useState(null)

  const handleAddToCart = (product) => {
    if (product.hasOptions) {
      navigate(`/product/${product.id}`)
      return
    }

    addToCart(product)

    setAddedProductId(product.id)

    setTimeout(() => {
      setAddedProductId(null)
    }, 1500)
  }

  if (wishlistItems.length === 0) {
    return (
      <main className="wishlist-page">

        <section className="wishlist-empty">

          <div className="container">

            <div className="wishlist-empty-icon-wrap">
              <FiHeart className="wishlist-empty-icon" />
            </div>

            <span className="section-eyebrow">
              YOUR WISHLIST
            </span>

            <h1>
              Your wishlist is empty.
            </h1>

            <p>
              Save products you love and come back
              to them whenever you are ready.
            </p>

            <Link
              to="/shop"
              className="btn btn-primary"
            >
              Explore Products
              <FiArrowRight />
            </Link>

          </div>

        </section>

      </main>
    )
  }

  return (
    <main className="wishlist-page">

      <section className="wishlist-section">

        <div className="container">

          {/* HEADER */}

          <div className="wishlist-heading">

            <span className="section-eyebrow">
              YOUR WISHLIST
            </span>

            <div className="wishlist-title-row">

              <div>

                <h1>
                  Saved Products
                </h1>

                <p>
                  {wishlistItems.length}{' '}
                  {wishlistItems.length === 1
                    ? 'product'
                    : 'products'}{' '}
                  saved
                </p>

              </div>

              <div className="wishlist-heart-mark">
                <FiHeart />
              </div>

            </div>

          </div>


          {/* PRODUCTS */}

          <div className="wishlist-grid">

            {wishlistItems.map((product) => (

              <article
                className="wishlist-card"
                key={product.id}
              >

                {/* IMAGE */}

                <div className="wishlist-image">

                  <Link
                    to={`/product/${product.id}`}
                    className="product-image-link"
                    aria-label={`View ${product.name}`}
                  >
                    <img
                      src={product.image}
                      alt=""
                    />
                  </Link>

                  <div className="wishlist-saved-badge">
                    <FiHeart />
                    Saved
                  </div>

                </div>


                {/* INFO */}

                <div className="wishlist-info">

                  <span className="wishlist-category">
                    {product.category}
                  </span>

                  <h2>
                    <Link
                      to={`/product/${product.id}`}
                      className="shop-product-name-link"
                    >
                      {product.name}
                    </Link>
                  </h2>

                  <p>
                    {product.description}
                  </p>

                  <strong className="wishlist-price">
                    KSh {Number(product.price).toLocaleString()}
                  </strong>


                  {/* ACTIONS */}

                  <div className="wishlist-actions">

                    <button
                      type="button"
                      className={
                        addedProductId === product.id
                          ? 'btn btn-primary wishlist-add-btn added'
                          : 'btn btn-primary wishlist-add-btn'
                      }
                      onClick={() =>
                        handleAddToCart(product)
                      }
                    >

                      {addedProductId === product.id ? (
                        <>
                          <FiCheck />
                          Added to Bag
                        </>
                      ) : (
                        <>
                          <FiShoppingBag />
                          Add to Bag
                        </>
                      )}

                    </button>


                    <button
                      type="button"
                      className="wishlist-remove"
                      onClick={() =>
                        removeFromWishlist(product.id)
                      }
                      aria-label={`Remove ${product.name} from wishlist`}
                    >

                      <FiTrash2 />

                      <span>
                        Remove
                      </span>

                    </button>

                  </div>

                </div>

              </article>

            ))}

          </div>

        </div>

      </section>

    </main>
  )
}

export default Wishlist