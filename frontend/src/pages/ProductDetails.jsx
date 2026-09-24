import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  FiArrowLeft,
  FiHeart,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiCheck,
  FiArrowRight,
  FiStar,
  FiShield,
  FiTruck,
  FiRotateCcw,
  FiInfo
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { buildCategoryLookup, normalizeStoreProduct } from '../lib/storeProduct'
import {
  applySelectedVariant,
  availableVariants,
  colorSwatch,
} from '../lib/productOptions'
import { useCart } from '../context/useCart'
import { useWishlist } from '../context/useWishlist'
import { BRAND } from '../lib/brand'
import { getStorefrontCommerce } from '../lib/storefront'
import { whatsappHref } from '../lib/whatsapp'
import ProductReviews from '../components/ProductReviews'

const ProductDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()

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
  const [whatsappNumber, setWhatsappNumber] = useState(BRAND.phone)

  const [added, setAdded] = useState(false)
  const [addedProductId, setAddedProductId] = useState(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [optionError, setOptionError] = useState('')

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setWhatsappNumber(data.whatsapp_number || BRAND.phone)
    })
  }, [])

  // =========================================================
  // LOAD PRODUCT + SIMILAR PRODUCTS
  // =========================================================

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      setError('')
      setProduct(null)
      setSimilarProducts([])
      setQuantity(1)
      setAdded(false)
      setSelectedVariantId('')
      setOptionError('')

      const {
        data,
        error: productError
      } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('id', id)
        .eq('active', true)
        .maybeSingle()

      if (productError || !data) {
        if (productError) {
          console.error(
            'SUPABASE PRODUCT DETAILS ERROR:',
            productError
          )
        }

        setError(
          productError
            ? 'We could not load this product right now.'
            : 'The product you are looking for does not exist or may have been removed.'
        )

        setLoading(false)
        return
      }

      const { data: categoryData } = await supabase
        .from('category')
        .select('id, name')
        .order('id', { ascending: true })

      const categoryLookup = buildCategoryLookup(categoryData)
      const normalizedProduct = normalizeStoreProduct(
        data,
        categoryLookup
      )

      const firstOption =
        availableVariants(normalizedProduct).find(
          (row) => Number(row.stock_quantity) > 0
        ) || availableVariants(normalizedProduct)[0]

      setSelectedVariantId(firstOption?.id ? String(firstOption.id) : '')
      setProduct(normalizedProduct)

      const {
        data: allProducts,
        error: similarError
      } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('active', true)
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

      const normalizedProducts = (allProducts || []).map((item) =>
        normalizeStoreProduct(item, categoryLookup)
      )

      const sameCategory = normalizedProducts.filter(
        (item) => item.category === normalizedProduct.category
      )

      const otherProducts = normalizedProducts.filter(
        (item) => item.category !== normalizedProduct.category
      )

      setSimilarProducts(
        [...sameCategory, ...otherProducts].slice(0, 4)
      )

      setLoading(false)
    }

    loadProducts()
  }, [id])


  const selectable = product ? availableVariants(product) : []
  const selectedVariant = selectable.find(
    (row) => String(row.id) === String(selectedVariantId)
  ) || null
  const displayProduct = product
    ? applySelectedVariant(
        product,
        product.hasOptions ? selectedVariant : null
      )
    : null
  const optionKind =
    product?.variants?.[0]?.option_type === 'size' ? 'size' : 'color'
  const optionTitle = optionKind === 'size' ? 'Size' : 'Colour'


  // =========================================================
  // QUANTITY
  // =========================================================

  const handleDecrease = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    )
  }


  const handleIncrease = () => {
    if (!displayProduct) return

    setQuantity((current) =>
      Math.min(
        displayProduct.stock_quantity,
        current + 1
      )
    )
  }


  // =========================================================
  // ADD MAIN PRODUCT TO CART
  // =========================================================

  const handleAddToCart = () => {
    if (!displayProduct) return

    if (product.hasOptions && !selectedVariant) {
      setOptionError(`Select a ${optionTitle.toLowerCase()} first.`)
      return
    }

    if (displayProduct.stock_quantity <= 0) {
      return
    }

    addToCart(displayProduct, quantity)

    setAdded(true)
    setOptionError('')

    setTimeout(() => {
      setAdded(false)
    }, 1500)
  }


  // =========================================================
  // ADD RECOMMENDED PRODUCT
  // =========================================================

  const handleAddRecommended = (recommendedProduct) => {
    if (recommendedProduct.hasOptions) {
      navigate(`/product/${recommendedProduct.id}`)
      return
    }

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
              SLEEK SISTERS
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

  const outOfStock = product.hasOptions
    ? !selectedVariant || displayProduct.stock_quantity <= 0
    : displayProduct.stock_quantity <= 0

  const lowStock =
    displayProduct.stock_quantity > 0 &&
    displayProduct.stock_quantity <= 5


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

            {/* IMAGE GALLERY */}

            <div className="product-gallery">
              <div className="product-details-image">

                <img
                  src={displayProduct.image}
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
            </div>


            {/* INFORMATION */}

            <div className="product-details-info">
            
              <div className="product-header-group">
                <span className="product-details-category">
                  {product.category}
                </span>

                <h1>
                  {product.name}
                </h1>
                
                <div className="product-price-wrapper">
                  <strong className="product-details-price">
                    KSh {displayProduct.price.toLocaleString()}
                  </strong>
                  <span className="price-note">incl. tax</span>
                </div>
              </div>

              <div className="product-details-divider" />

              <p className="product-details-description">
                {product.description}
              </p>

              {product.hasOptions ? (
                <div className="product-variant-selector">
                  <span>
                    {optionTitle}
                    {selectedVariant ? ` — ${selectedVariant.option_value}` : ''}
                  </span>

                  <div className={optionKind === 'color' ? 'variant-swatches' : 'variant-pills'}>
                    {product.variants
                    .filter((variant) => variant.available !== false)
                    .map((variant) => {
                      const isSelected =
                        String(variant.id) === String(selectedVariantId)
                      const canBuy =
                        variant.available !== false &&
                        Number(variant.stock_quantity) > 0

                      if (optionKind === 'color') {
                        return (
                          <button
                            type="button"
                            key={variant.id}
                            className={`variant-swatch${isSelected ? ' active' : ''}${canBuy ? '' : ' unavailable'}`}
                            style={{ background: colorSwatch(variant.option_value) }}
                            disabled={!canBuy}
                            onClick={() => {
                              setSelectedVariantId(String(variant.id))
                              setQuantity(1)
                              setOptionError('')
                            }}
                            aria-label={variant.option_value}
                            title={
                              canBuy
                                ? variant.option_value
                                : `${variant.option_value} is not available`
                            }
                          />
                        )
                      }

                      return (
                        <button
                          type="button"
                          key={variant.id}
                          className={`variant-pill${isSelected ? ' active' : ''}${canBuy ? '' : ' unavailable'}`}
                          disabled={!canBuy}
                          onClick={() => {
                            setSelectedVariantId(String(variant.id))
                            setQuantity(1)
                            setOptionError('')
                          }}
                        >
                          {variant.option_value}
                        </button>
                      )
                    })}
                  </div>

                  {optionError ? (
                    <p className="product-option-error">{optionError}</p>
                  ) : null}
                </div>
              ) : null}


              {/* STOCK STATUS */}

              <div className="product-details-stock">

                {outOfStock ? (

                  <span className="status-badge unavailable">
                    Currently Unavailable
                  </span>

                ) : lowStock ? (

                  <span className="status-badge low-stock">
                    Only {displayProduct.stock_quantity} left in stock
                  </span>

                ) : (

                  <span className="status-badge in-stock">
                    In stock
                  </span>

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
                        displayProduct.stock_quantity
                      }
                      aria-label="Increase quantity"
                    >
                      <FiPlus />
                    </button>

                  </div>

                </div>

              )}


              {/* TRUST BADGES */}
              <div className="trust-badges">
                <div className="trust-badge-pill">
                  <FiTruck /> Nairobi from KSh 200 · Pickup free
                </div>
                <div className="trust-badge-pill">
                  <FiShield /> Secure Checkout
                </div>
                <div className="trust-badge-pill">
                  <FiRotateCcw /> Easy Returns
                </div>
              </div>


              {/* ACTIONS */}

              <div className="product-details-actions">

                {outOfStock ? (
                  <Link
                    to="/contact"
                    className="btn btn-primary product-add-btn"
                  >
                    Ask about this product
                  </Link>
                ) : (
                  <div className="product-details-actions-row">
                    <button
                      type="button"
                      className={
                        added
                          ? 'btn btn-primary product-add-btn added'
                          : 'btn btn-primary product-add-btn'
                      }
                      onClick={handleAddToCart}
                    >
                      {added ? (
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
                )}


                <div className="product-details-actions-row">
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

                <a
                  className="btn btn-secondary product-add-btn"
                  href={whatsappHref(
                    whatsappNumber,
                    `Hello Sleek Sisters, I am interested in ${product.name}${selectedVariant ? ` (${selectedVariant.option_value})` : ''}.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ask on WhatsApp
                </a>

              </div>


              {/* EXTRA INFORMATION / META GRID */}

              <div className="product-details-extra">
                <div className="meta-grid">
                
                  <div className="meta-item">
                    <div className="meta-icon">
                      <FiInfo />
                    </div>
                    <div className="meta-content">
                      <span>Category</span>
                      <strong>{product.category}</strong>
                    </div>
                  </div>
                  
                  <div className="meta-item">
                    <div className="meta-icon">
                      <FiStar />
                    </div>
                    <div className="meta-content">
                      <span>Collection</span>
                      <strong>Sleek Sisters</strong>
                    </div>
                  </div>
                  
                  <div className="meta-item">
                    <div className="meta-icon">
                      <FiCheck />
                    </div>
                    <div className="meta-content">
                      <span>Availability</span>
                      <strong>{outOfStock ? 'Out of Stock' : 'Available Now'}</strong>
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

      {product?.id ? <ProductReviews productId={product.id} /> : null}

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

                        <Link
                          to={`/product/${recommendedProduct.id}`}
                          className="product-image-link"
                          aria-label={`View ${recommendedProduct.name}`}
                        >
                          <img
                            src={recommendedProduct.image}
                            alt=""
                          />
                        </Link>


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
                          <Link
                            to={`/product/${recommendedProduct.id}`}
                            className="shop-product-name-link"
                          >
                            {recommendedProduct.name}
                          </Link>
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