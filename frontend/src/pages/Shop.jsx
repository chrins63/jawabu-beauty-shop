import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase'
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
// SHOP CATEGORIES
// =========================================================

const categories = [
  'All',
  'Skincare',
  'Hair Care',
  'Makeup',
  'Fragrance'
]


// =========================================================
// NORMALIZE CATEGORY NAME
// =========================================================
// Makes database values such as:
// "Hair care"
// "Hair Care"
// "hair care"
// all behave the same.
// =========================================================

const normalizeCategory = (value) => {
  if (!value) return ''

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}


// =========================================================
// SHOP
// =========================================================

const Shop = () => {

  const { addToCart } = useCart()

  const {
    isInWishlist,
    toggleWishlist
  } = useWishlist()


  // =========================================================
  // DATABASE
  // =========================================================

  const [databaseProducts, setDatabaseProducts] = useState([])

  const [, setDatabaseCategories] = useState([])

  const [loading, setLoading] = useState(true)

  const [databaseError, setDatabaseError] = useState('')


  // =========================================================
  // SHOP CONTROLS
  // =========================================================

  const [activeCategory, setActiveCategory] = useState('All')

  const [searchTerm, setSearchTerm] = useState('')

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
          .select('*')
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


        console.log(
          'SUPABASE CATEGORIES:',
          categoryData
        )


        console.log(
          'SUPABASE PRODUCTS:',
          productData
        )


        // -----------------------------------------------------
        // SAVE CATEGORIES
        // -----------------------------------------------------

        setDatabaseCategories(
          categoryData || []
        )


        // -----------------------------------------------------
        // CREATE CATEGORY LOOKUP
        // -----------------------------------------------------
        //
        // Example:
        //
        // {
        //   1: "Hair care",
        //   2: "Skincare",
        //   3: "Makeup",
        //   4: "Fragrance"
        // }
        //
        // -----------------------------------------------------

        const categoryLookup = {}

        ;(categoryData || []).forEach(
          (category) => {

            categoryLookup[category.id] =
              category.name || ''

          }
        )


        // -----------------------------------------------------
        // NORMALIZE PRODUCTS
        // -----------------------------------------------------

        const normalizedProducts =
          (productData || []).map(
            (product) => {

              const categoryName =
                categoryLookup[
                  product.category_id
                ] || 'Beauty'


              return {

                id: product.id,


                name:
                  product.name ||
                  product.product_name ||
                  'Unnamed Product',


                // Actual category name
                category:
                  categoryName,


                // Normalized category used
                // internally for filtering
                categoryKey:
                  normalizeCategory(
                    categoryName
                  ),


                // Keep category ID available
                category_id:
                  product.category_id,


                price:
                  Number(product.price) || 0,


                image:
                  product.image_url ||
                  product.image ||
                  '/images/products/placeholder.jpg',


                description:
                  product.description ||
                  'A beautiful addition to your everyday routine.',


                stock_quantity:
                  Number(
                    product.stock_quantity ??
                    product.stock_qty ??
                    product.stock ??
                    0
                  )

              }

            }
          )


        console.log(
          'NORMALIZED PRODUCTS:',
          normalizedProducts
        )


        setDatabaseProducts(
          normalizedProducts
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


  // =========================================================
  // ADD TO CART
  // =========================================================

  const handleAddToCart = (product) => {

    addToCart(product)


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

      const selectedCategory =
        normalizeCategory(
          activeCategory
        )


      result = result.filter(
        (product) => {

          return (
            normalizeCategory(
              product.category
            ) === selectedCategory
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
                Jawabu Beauty collection.
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
            JAWABU BEAUTY SHOP
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
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search beauty products..."
                aria-label="Search beauty products"
              />

            </div>


            {/* SORT */}

            <div className="shop-sort">

              <FiSliders />


              <span>
                Sort by
              </span>


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


              <FiChevronDown />

            </div>

          </div>


          {/* =================================================
              CATEGORIES
          ================================================= */}

          <div className="shop-categories">

            {categories.map(
              (category) => (

                <button
                  key={category}
                  type="button"
                  className={
                    activeCategory === category
                      ? 'category-filter active'
                      : 'category-filter'
                  }
                  onClick={() =>
                    setActiveCategory(
                      category
                    )
                  }
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


                          <img
                            src={product.image}
                            alt={product.name}
                          />


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


                          <h2>
                            {product.name}
                          </h2>


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
                              aria-label={
                                addedProductId ===
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

                              {addedProductId ===
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

                      setSearchTerm('')

                      setActiveCategory('All')

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
                THE JAWABU STANDARD
              </span>


              <h2>

                Beauty that feels

                <span>
                  personal.
                </span>

              </h2>


              <p>
                Discover products selected to make your
                everyday beauty routine feel better.
              </p>

            </div>


            <div className="shop-cta-mark">
              JAWABU
            </div>


          </div>

        </div>

      </section>

    </main>

  )

}


export default Shop