import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { categorySlug, slugMatchesCategory } from '../lib/brand'
import { buildCategoryLookup, isInStock, normalizeStoreProduct } from '../lib/storeProduct'
import { useCart } from '../context/useCart'
import { useWishlist } from '../context/useWishlist'
import {
  FiHeart,
  FiSearch,
  FiSliders,
  FiArrowRight,
  FiShoppingBag,
  FiChevronDown,
  FiCheck
} from 'react-icons/fi'


// =========================================================
// SHOP
// =========================================================

const Shop = () => {

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { addToCart } = useCart()

  const {
    isInWishlist,
    toggleWishlist
  } = useWishlist()


  // =========================================================
  // DATABASE
  // =========================================================

  const [databaseProducts, setDatabaseProducts] = useState([])

  const [databaseCategories, setDatabaseCategories] = useState([])

  const [loading, setLoading] = useState(true)

  const [databaseError, setDatabaseError] = useState('')


  // =========================================================
  // SHOP CONTROLS
  // =========================================================

  const [activeCategory, setActiveCategory] = useState('All')

  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('search') || ''
  )

  const [sortBy, setSortBy] = useState('featured')

  const [addedProductId, setAddedProductId] = useState(null)


  // =========================================================
  // LOAD PRODUCTS + CATEGORIES
  // =========================================================

  useEffect(() => {

    const loadShopData = async () => {

      setLoading(true)

      setDatabaseError('')


      try {

        // -----------------------------------------------------
        // LOAD CATEGORIES
        // -----------------------------------------------------

        const {
          data: categoryData,
          error: categoryError
        } = await supabase
          .from('category')
          .select('*')
          .order('id', {
            ascending: true
          })


        if (categoryError) {

          console.error(
            'SUPABASE CATEGORY ERROR:',
            categoryError
          )

          throw categoryError

        }


        // -----------------------------------------------------
        // LOAD PRODUCTS
        // -----------------------------------------------------

        const {
          data: productData,
          error: productError
        } = await supabase
          .from('products')
          .select('*, product_variants(*)')
          .eq('active', true)
          .order('id', {
            ascending: true
          })


        if (productError) {

          console.error(
            'SUPABASE PRODUCTS ERROR:',
            productError
          )

          throw productError

        }


        setDatabaseCategories(
          categoryData || []
        )

        const categoryLookup = buildCategoryLookup(categoryData)

        setDatabaseProducts(
          (productData || []).map((product) =>
            normalizeStoreProduct(product, categoryLookup)
          )
        )

      } catch (error) {

        console.error(
          'SUPABASE SHOP ERROR:',
          error
        )


        setDatabaseError(
          'We could not load the products right now.'
        )


        setDatabaseProducts([])

        setDatabaseCategories([])

      } finally {

        setLoading(false)

      }

    }


    loadShopData()

  }, [])

  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const searchParam = searchParams.get('search') || ''

    // Keep filters aligned with the shop URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm(searchParam)

    if (!categoryParam) {
      setActiveCategory('All')
      return
    }

    const matched = (databaseCategories || []).find((category) =>
      slugMatchesCategory(categoryParam, category.name)
    )

    if (matched) {
      setActiveCategory(matched.name)
    }
  }, [searchParams, databaseCategories])

  const updateShopParams = (updates) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    })

    setSearchParams(next, { replace: true })
  }


  // =========================================================
  // ADD TO CART
  // =========================================================

  const handleAddToCart = (product) => {
    if (product.hasOptions) {
      navigate(`/product/${product.id}`)
      return
    }

    if (!isInStock(product) || !addToCart(product)) {
      return
    }

    setAddedProductId(
      product.id
    )

    setTimeout(() => {
      setAddedProductId(null)
    }, 1500)
  }


  // =========================================================
  // FILTER + SEARCH + SORT
  // =========================================================

  const filteredProducts = useMemo(() => {

    let result = [
      ...databaseProducts
    ]


    // =======================================================
    // CATEGORY FILTER
    // =======================================================

    if (activeCategory !== 'All') {
      result = result.filter(
        (product) => {
          return slugMatchesCategory(
            categorySlug(activeCategory),
            product.category
          )
        }
      )
    }


    // =======================================================
    // SEARCH
    // =======================================================

    if (searchTerm.trim()) {

      const search =
        searchTerm
          .toLowerCase()
          .trim()


      result = result.filter(
        (product) => {

          const name =
            String(
              product.name || ''
            ).toLowerCase()


          const category =
            String(
              product.category || ''
            ).toLowerCase()


          const description =
            String(
              product.description || ''
            ).toLowerCase()


          return (
            name.includes(search) ||
            category.includes(search) ||
            description.includes(search)
          )

        }
      )

    }


    // =======================================================
    // SORT
    // =======================================================

    if (sortBy === 'price-low') {

      result.sort(
        (a, b) =>
          a.price - b.price
      )

    }


    if (sortBy === 'price-high') {

      result.sort(
        (a, b) =>
          b.price - a.price
      )

    }


    if (sortBy === 'name') {

      result.sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      )

    }


    return result

  }, [
    databaseProducts,
    activeCategory,
    searchTerm,
    sortBy
  ])


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <main className="shop-page">

        <section className="shop-products-section">

          <div className="container">

            <div className="shop-empty">

              <div className="shop-empty-icon">

                <FiShoppingBag />

              </div>


              <h2>
                Loading products...
              </h2>


              <p>
                Please wait while we load the
                Sleek Sisters collection.
              </p>

            </div>

          </div>

        </section>

      </main>

    )

  }


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <main className="shop-page">


      {/* =====================================================
          SHOP HERO
      ===================================================== */}

      <section className="shop-hero">

        <div className="container">

          <span className="section-eyebrow">
            SLEEK SISTERS
          </span>


          <h1>

            Beauty essentials,

            <span>
              chosen for you.
            </span>

          </h1>


          <p>
            Explore our collection of beauty products designed
            to fit your everyday routine.
          </p>

        </div>

      </section>


      {/* =====================================================
          SHOP CONTROLS
      ===================================================== */}

      <section className="shop-controls-section">

        <div className="container">


          <div className="shop-controls">


            {/* SEARCH */}

            <div className="shop-search">

              <FiSearch />


              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  updateShopParams({
                    search: event.target.value
                  })
                }
                placeholder="Search beauty products..."
                aria-label="Search beauty products"
              />

            </div>


            {/* SORT */}

            <div className="shop-sort">

              <FiSliders aria-hidden="true" />

              <span>
                Sort by
              </span>

              <strong className="shop-sort-value">
                {sortBy === 'price-low'
                  ? 'Price: Low to High'
                  : sortBy === 'price-high'
                    ? 'Price: High to Low'
                    : sortBy === 'name'
                      ? 'Name'
                      : 'Featured'}
              </strong>

              <FiChevronDown
                className="shop-sort-chevron"
                aria-hidden="true"
              />

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
                aria-label="Sort products"
              >

                <option value="featured">
                  Featured
                </option>


                <option value="price-low">
                  Price: Low to High
                </option>


                <option value="price-high">
                  Price: High to Low
                </option>


                <option value="name">
                  Name
                </option>

              </select>

            </div>

          </div>


          {/* =================================================
              CATEGORIES
          ================================================= */}

          <div className="shop-categories">

            {['All', ...databaseCategories.map((category) => category.name)].map(
              (category) => (

                <button
                  key={category}
                  type="button"
                  className={
                    activeCategory === category
                      ? 'category-filter active'
                      : 'category-filter'
                  }
                  onClick={() => {
                    setActiveCategory(category)

                    updateShopParams({
                      category:
                        category === 'All'
                          ? ''
                          : categorySlug(category),
                    })
                  }}
                >

                  {category}

                </button>

              )
            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          PRODUCTS
      ===================================================== */}

      <section className="shop-products-section">

        <div className="container">


          {/* DATABASE ERROR */}

          {databaseError && (

            <div className="shop-empty">

              <div className="shop-empty-icon">

                <FiSearch />

              </div>


              <h2>
                Products unavailable
              </h2>


              <p>
                {databaseError}
              </p>


              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>

            </div>

          )}


          {/* =================================================
              PRODUCTS
          ================================================= */}

          {!databaseError && (

            <>


              {/* PRODUCTS HEADER */}

              <div className="shop-products-header">

                <div>

                  <span>

                    {filteredProducts.length}{' '}

                    {filteredProducts.length === 1
                      ? 'product'
                      : 'products'}

                  </span>

                </div>


                <span className="shop-active-category">

                  {activeCategory.toUpperCase()}

                </span>

              </div>


              {/* =================================================
                  PRODUCT GRID
              ================================================= */}

              {filteredProducts.length > 0 ? (

                <div className="shop-products-grid">

                  {filteredProducts.map(
                    (product) => (

                      <article
                        className="shop-product-card"
                        key={product.id}
                      >


                        {/* PRODUCT IMAGE */}

                        <div className="shop-product-image">

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


                          {/* WISHLIST */}

                          <button
                            type="button"
                            className={
                              isInWishlist(
                                product.id
                              )
                                ? 'product-wishlist active'
                                : 'product-wishlist'
                            }
                            onClick={() =>
                              toggleWishlist(
                                product
                              )
                            }
                            aria-label={
                              isInWishlist(
                                product.id
                              )
                                ? `Remove ${product.name} from wishlist`
                                : `Add ${product.name} to wishlist`
                            }
                          >

                            <FiHeart />

                          </button>


                          {/* VIEW PRODUCT */}

                          <Link
                            to={`/product/${product.id}`}
                            className="product-quick-view"
                          >

                            View product

                            <FiArrowRight />

                          </Link>

                        </div>


                        {/* PRODUCT INFORMATION */}

                        <div className="shop-product-info">


                          <span className="shop-product-category">

                            {product.category}

                          </span>


                          <Link
                            to={`/product/${product.id}`}
                            className="shop-product-name-link"
                          >
                            <h2>
                              {product.name}
                            </h2>
                          </Link>


                          <p className="shop-product-description">

                            {product.description}

                          </p>


                          <div className="shop-product-bottom">


                            <strong>

                              KSh{' '}

                              {Number(
                                product.price
                              ).toLocaleString()}

                            </strong>


                            {/* ADD TO CART */}

                            <button
                              type="button"
                              className={
                                addedProductId ===
                                product.id
                                  ? 'add-to-bag added'
                                  : 'add-to-bag'
                              }
                              disabled={!product.hasOptions && !isInStock(product)}
                              aria-label={
                                product.hasOptions
                                  ? `Choose ${product.name}`
                                  : !isInStock(product)
                                    ? `${product.name} is sold out`
                                  : addedProductId ===
                                    product.id
                                    ? `${product.name} added to bag`
                                    : `Add ${product.name} to bag`
                              }
                              onClick={() =>
                                handleAddToCart(
                                  product
                                )
                              }
                            >

                              {!product.hasOptions && !isInStock(product) ? (
                                <span>Sold out</span>
                              ) : product.hasOptions ? (

                                <>

                                  <FiArrowRight />

                                  <span>
                                    Choose
                                  </span>

                                </>

                              ) : addedProductId ===
                              product.id ? (

                                <>

                                  <FiCheck />

                                  <span>
                                    Added
                                  </span>

                                </>

                              ) : (

                                <>

                                  <FiShoppingBag />

                                  <span>
                                    Add
                                  </span>

                                </>

                              )}

                            </button>

                          </div>

                        </div>

                      </article>

                    )
                  )}

                </div>

              ) : (

                /* =================================================
                   NO PRODUCTS
                ================================================= */

                <div className="shop-empty">

                  <div className="shop-empty-icon">

                    <FiSearch />

                  </div>


                  <h2>
                    No products found
                  </h2>


                  <p>
                    Try a different search or category.
                  </p>


                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSearchParams({}, { replace: true })
                    }}
                  >
                    View all products
                  </button>

                </div>

              )}

            </>

          )}

        </div>

      </section>


      {/* =====================================================
          SHOP CTA
      ===================================================== */}

      <section className="shop-cta-section">

        <div className="container">

          <div className="shop-cta">


            <div>

              <span className="section-eyebrow">
                THE SLEEK STANDARD
              </span>


              <h2>

                Look good. Feel beautiful.

                <span>
                  Stay sleek.
                </span>

              </h2>


              <p>
                Discover products selected to make your
                everyday beauty routine feel better.
              </p>

            </div>


            <div className="shop-cta-mark">
              SLEEK
            </div>


          </div>

        </div>

      </section>

    </main>

  )

}


export default Shop