import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  FiArrowLeft,
  FiHeart,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiCheck,
  FiArrowRight
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { useCart } from '../context/useCart'
import { useWishlist } from '../context/useWishlist'

const ProductDetails = () => {
  const { id } = useParams()

  const { addToCart } = useCart()

  const {
    isInWishlist,
    toggleWishlist
  } = useWishlist()

  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])

  const [quantity, setQuantity] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [added, setAdded] = useState(false)
  const [addedProductId, setAddedProductId] = useState(null)


  // =========================================================
  // LOAD PRODUCT + SIMILAR PRODUCTS
  // =========================================================

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      setError('')
      setProduct(null)
      setSimilarProducts([])

      // -------------------------------------------------------
      // LOAD SELECTED PRODUCT
      // -------------------------------------------------------

      const {
        data,
        error: productError
      } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (productError) {
        console.error(
          'SUPABASE PRODUCT DETAILS ERROR:',
          productError
        )

        setError(
          'We could not load this product right now.'
        )

        setLoading(false)
        return
      }

      // -------------------------------------------------------
      // NORMALIZE SELECTED PRODUCT
      // -------------------------------------------------------

      const normalizedProduct = {
        id: data.id,

        name:
          data.name ||
          data.product_name ||
          'Unnamed Product',

        category:
          data.category ||
          data.category_name ||
          'Beauty',

        filter:
          data.filter ||
          data.category ||
          data.category_name ||
          'Skincare',

        price:
          Number(data.price) || 0,

        image:
          data.image ||
          data.image_url ||
          '/images/products/placeholder.jpg',

        description:
          data.description ||
          'A beautiful addition to your everyday routine.',

        stock_quantity:
          Number(
            data.stock_quantity ??
            data.stock_qty ??
            data.stock ??
            0
          )
      }

      setProduct(normalizedProduct)


      // -------------------------------------------------------
      // LOAD ALL OTHER PRODUCTS
      // -------------------------------------------------------

      const {
        data: allProducts,
        error: similarError
      } = await supabase
        .from('products')
        .select('*')
        .neq('id', id)
        .order('id', { ascending: true })

      if (similarError) {
        console.error(
          'SUPABASE SIMILAR PRODUCTS ERROR:',
          similarError
        )

        setSimilarProducts([])
        setLoading(false)
        return
      }


      // -------------------------------------------------------
      // NORMALIZE PRODUCTS
      // -------------------------------------------------------

      const normalizedProducts = (allProducts || []).map(
        (item) => ({
          id: item.id,

          name:
            item.name ||
            item.product_name ||
            'Unnamed Product',

          category:
            item.category ||
            item.category_name ||
            'Beauty',

          filter:
            item.filter ||
            item.category ||
            item.category_name ||
            'Skincare',

          price:
            Number(item.price) || 0,

          image:
            item.image ||
            item.image_url ||
            '/images/products/placeholder.jpg',

          description:
            item.description ||
            'A beautiful addition to your everyday routine.',

          stock_quantity:
            Number(
              item.stock_quantity ??
              item.stock_qty ??
              item.stock ??
              0
            )
        })
      )


      // -------------------------------------------------------
      // FIND PRODUCTS IN SAME CATEGORY
      // -------------------------------------------------------

      const sameCategory = normalizedProducts.filter(
        (item) =>
          item.category === normalizedProduct.category ||
          item.filter === normalizedProduct.filter
      )


      // -------------------------------------------------------
      // IF NOT ENOUGH SAME CATEGORY PRODUCTS,
      // ADD OTHER PRODUCTS
      // -------------------------------------------------------

      const otherProducts = normalizedProducts.filter(
        (item) =>
          item.category !== normalizedProduct.category &&
          item.filter !== normalizedProduct.filter
      )


      const recommendations = [
        ...sameCategory,
        ...otherProducts
      ].slice(0, 4)


      setSimilarProducts(recommendations)

      setLoading(false)
    }

    loadProducts()
  }, [id])


  // =========================================================
  // QUANTITY
  // =========================================================

  const handleDecrease = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    )
  }


  const handleIncrease = () => {
    if (!product) return

    setQuantity((current) =>
      Math.min(
        product.stock_quantity,
        current + 1
      )
    )
  }


  // =========================================================
  // ADD MAIN PRODUCT TO CART
  // =========================================================

  const handleAddToCart = () => {
    if (!product) return

    if (product.stock_quantity <= 0) {
      return
    }

    for (let i = 0; i < quantity; i += 1) {
      addToCart(product)
    }

    setAdded(true)

    setTimeout(() => {
      setAdded(false)
    }, 1500)
  }


  // =========================================================
  // ADD RECOMMENDED PRODUCT
  // =========================================================

  const handleAddRecommended = (recommendedProduct) => {
    if (recommendedProduct.stock_quantity <= 0) {
      return
    }

    addToCart(recommendedProduct)

    setAddedProductId(recommendedProduct.id)

    setTimeout(() => {
      setAddedProductId(null)
    }, 1500)
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="product-details-page">

        <section className="product-not-found">

          <div className="container">

            <span className="section-eyebrow">
              JAWABU BEAUTY
            </span>

            <h1>
              Loading product...
            </h1>

            <p>
              Please wait while we load the product.
            </p>

          </div>

        </section>

      </main>
    )
  }


  // =========================================================
  // ERROR / NOT FOUND
  // =========================================================

  if (error || !product) {
    return (
      <main className="product-details-page">

        <section className="product-not-found">

          <div className="container">

            <span className="section-eyebrow">
              PRODUCT
            </span>

            <h1>
              Product not found.
            </h1>

            <p>
              {error ||
                'The product you are looking for does not exist or may have been removed.'}
            </p>

            <Link
              to="/shop"
              className="btn btn-primary"
            >
              <FiArrowLeft />
              Back to Shop
            </Link>

          </div>

        </section>

      </main>
    )
  }


  // =========================================================
  // STOCK
  // =========================================================

  const outOfStock =
    product.stock_quantity <= 0

  const lowStock =
    product.stock_quantity > 0 &&
    product.stock_quantity <= 5


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="product-details-page">

      {/* =====================================================
          MAIN PRODUCT
      ===================================================== */}

      <section className="product-details-section">

        <div className="container">

          {/* BACK */}

          <Link
            to="/shop"
            className="product-details-back"
          >
            <FiArrowLeft />
            Back to Shop
          </Link>


          {/* PRODUCT */}

          <div className="product-details-layout">

            {/* IMAGE */}

            <div className="product-details-image">

              <img
                src={product.image}
                alt={product.name}
              />


              {/* WISHLIST */}

              <button
                type="button"
                className={
                  isInWishlist(product.id)
                    ? 'product-details-wishlist active'
                    : 'product-details-wishlist'
                }
                onClick={() =>
                  toggleWishlist(product)
                }
                aria-label={
                  isInWishlist(product.id)
                    ? `Remove ${product.name} from wishlist`
                    : `Add ${product.name} to wishlist`
                }
              >
                <FiHeart />
              </button>

            </div>


            {/* INFORMATION */}

            <div className="product-details-info">

              <span className="product-details-category">
                {product.category}
              </span>

              <h1>
                {product.name}
              </h1>

              <strong className="product-details-price">
                KSh {product.price.toLocaleString()}
              </strong>

              <div className="product-details-divider" />

              <p className="product-details-description">
                {product.description}
              </p>


              {/* STOCK */}

              <div className="product-details-stock">

                {outOfStock ? (

                  <strong>
                    Out of stock
                  </strong>

                ) : lowStock ? (

                  <strong>
                    Only {product.stock_quantity} left in stock
                  </strong>

                ) : (

                  <strong>
                    In stock
                  </strong>

                )}

              </div>


              {/* QUANTITY */}

              {!outOfStock && (

                <div className="product-details-quantity">

                  <span>
                    Quantity
                  </span>

                  <div className="quantity-control">

                    <button
                      type="button"
                      onClick={handleDecrease}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <FiMinus />
                    </button>

                    <strong>
                      {quantity}
                    </strong>

                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={
                        quantity >=
                        product.stock_quantity
                      }
                      aria-label="Increase quantity"
                    >
                      <FiPlus />
                    </button>

                  </div>

                </div>

              )}


              {/* ACTIONS */}

              <div className="product-details-actions">

                <button
                  type="button"
                  className={
                    added
                      ? 'btn btn-primary product-add-btn added'
                      : 'btn btn-primary product-add-btn'
                  }
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                >

                  {outOfStock ? (

                    <>
                      <FiShoppingBag />
                      Out of Stock
                    </>

                  ) : added ? (

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
                  className={
                    isInWishlist(product.id)
                      ? 'product-wishlist-btn active'
                      : 'product-wishlist-btn'
                  }
                  onClick={() =>
                    toggleWishlist(product)
                  }
                >

                  <FiHeart />

                  {isInWishlist(product.id)
                    ? 'Saved to Wishlist'
                    : 'Save to Wishlist'}

                </button>

              </div>


              {/* EXTRA INFORMATION */}

              <div className="product-details-extra">

                <div>

                  <span>
                    Category
                  </span>

                  <strong>
                    {product.category}
                  </strong>

                </div>

                <div>

                  <span>
                    Collection
                  </span>

                  <strong>
                    Jawabu Beauty
                  </strong>

                </div>

                <div>

                  <span>
                    Availability
                  </span>

                  <strong>
                    {outOfStock
                      ? 'Out of Stock'
                      : 'Available'}
                  </strong>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          SIMILAR PRODUCTS
      ===================================================== */}

      {similarProducts.length > 0 && (

        <section className="product-recommendations-section">

          <div className="container">

            <div className="product-recommendations-heading">

              <div>

                <span className="section-eyebrow">
                  YOU MAY ALSO LIKE
                </span>

                <h2>
                  More to discover.
                </h2>

              </div>

              <Link
                to="/shop"
                className="product-recommendations-view-all"
              >
                View all products
                <FiArrowRight />
              </Link>

            </div>


            {/* RECOMMENDED PRODUCTS */}

            <div className="product-recommendations-grid">

              {similarProducts.map(
                (recommendedProduct) => {

                  const recommendedOutOfStock =
                    recommendedProduct.stock_quantity <= 0

                  return (

                    <article
                      className="recommended-product-card"
                      key={recommendedProduct.id}
                    >

                      {/* IMAGE */}

                      <div className="recommended-product-image">

                        <img
                          src={recommendedProduct.image}
                          alt={recommendedProduct.name}
                        />


                        {/* WISHLIST */}

                        <button
                          type="button"
                          className={
                            isInWishlist(
                              recommendedProduct.id
                            )
                              ? 'recommended-wishlist active'
                              : 'recommended-wishlist'
                          }
                          onClick={() =>
                            toggleWishlist(
                              recommendedProduct
                            )
                          }
                          aria-label={
                            isInWishlist(
                              recommendedProduct.id
                            )
                              ? `Remove ${recommendedProduct.name} from wishlist`
                              : `Add ${recommendedProduct.name} to wishlist`
                          }
                        >

                          <FiHeart />

                        </button>

                      </div>


                      {/* INFO */}

                      <div className="recommended-product-info">

                        <span>
                          {recommendedProduct.category}
                        </span>

                        <h3>
                          {recommendedProduct.name}
                        </h3>

                        <div className="recommended-product-bottom">

                          <strong>
                            KSh {Number(
                              recommendedProduct.price
                            ).toLocaleString()}
                          </strong>


                          {/* VIEW */}

                          <Link
                            to={`/product/${recommendedProduct.id}`}
                            className="recommended-view-btn"
                          >
                            View
                            <FiArrowRight />
                          </Link>

                        </div>


                        {/* ADD */}

                        <button
                          type="button"
                          className={
                            addedProductId ===
                            recommendedProduct.id
                              ? 'recommended-add-btn added'
                              : 'recommended-add-btn'
                          }
                          onClick={() =>
                            handleAddRecommended(
                              recommendedProduct
                            )
                          }
                          disabled={
                            recommendedOutOfStock
                          }
                        >

                          {recommendedOutOfStock ? (

                            <>
                              <FiShoppingBag />
                              Out of Stock
                            </>

                          ) : addedProductId ===
                            recommendedProduct.id ? (

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

                      </div>

                    </article>

                  )
                }
              )}

            </div>

          </div>

        </section>

      )}

    </main>
  )
}

export default ProductDetails