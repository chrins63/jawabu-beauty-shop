import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiHeart,
  FiStar,
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { subscribeToSms } from '../lib/sms'
import { subscribeToEmail } from '../lib/email'
import { BRAND, HOME_CATEGORIES } from '../lib/brand'
import { buildCategoryLookup, normalizeStoreProduct } from '../lib/storeProduct'
import { useWishlist } from '../context/useWishlist'

import './Home.css'

const ADVANTAGES = [
  {
    number: '01',
    title: 'Authentic Products',
    copy: 'Carefully selected beauty and lifestyle pieces you can trust.',
  },
  {
    number: '02',
    title: 'Affordable Prices',
    copy: 'Premium quality without a premium-only price tag.',
  },
  {
    number: '03',
    title: 'Excellent Service',
    copy: 'We help you choose products that suit your routine.',
  },
  {
    number: '04',
    title: 'Fast, Reliable Delivery',
    copy: 'Orders packed with care and sent across Kenya.',
  },
  {
    number: '05',
    title: 'Selected Brands',
    copy: 'Skincare, fragrance and accessories chosen for everyday elegance.',
  },
  {
    number: '06',
    title: 'Repeat Customers',
    copy: 'People come back because the products and service hold up.',
  },
]

const Home = () => {
  const { isInWishlist, toggleWishlist } = useWishlist()
  const [newArrivals, setNewArrivals] = useState([])
  const [bestsellers, setBestsellers] = useState([])
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState('')

  useEffect(() => {
    const loadHomeProducts = async () => {
      const [{ data: categoryData }, { data: newest }, { data: popular }] =
        await Promise.all([
          supabase.from('category').select('id, name'),
          supabase
            .from('products')
            .select('id, name, price, image_url, sku, category, category_id, stock_quantity, created_at')
            .eq('active', true)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(8),
          supabase.rpc('list_bestselling_products', { p_limit: 8 }),
        ])

      const categoryLookup = buildCategoryLookup(categoryData)

      setNewArrivals(
        (newest || []).map((item) =>
          normalizeStoreProduct(item, categoryLookup)
        )
      )
      setBestsellers(
        (popular || []).map((item) =>
          normalizeStoreProduct(item, categoryLookup)
        )
      )
    }

    loadHomeProducts()
  }, [])

  const handleNewsletter = async (event) => {
    event.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = phone.trim()

    if (!cleanEmail && !cleanPhone) {
      return
    }

    const notes = []

    if (cleanEmail) {
      const { error } = await subscribeToEmail({
        supabase,
        email: cleanEmail,
        source: 'home',
      })

      if (error) {
        if (/duplicate|already exists/i.test(String(error.message || ''))) {
          notes.push('You are already on the email list.')
        } else {
          setNewsletterStatus(
            error.message || 'Could not subscribe just now. Try again shortly.'
          )
          return
        }
      } else {
        notes.push(
          'We will email you from Sleek Sisters when a new product lands.'
        )
      }
    }

    if (cleanPhone) {
      const { error } = await subscribeToSms({
        supabase,
        phone: cleanPhone,
        source: 'home',
      })

      if (error) {
        setNewsletterStatus(
          error.message || 'Could not save that phone number.'
        )
        return
      }

      notes.push('We will text you when new products drop.')
    }

    setEmail('')
    setPhone('')
    setNewsletterStatus(notes.join(' ') || 'Thank you — we will keep you posted.')
  }

  return (
    <div className="home-page">
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-eyebrow">
              Your one-stop beauty &amp; lifestyle store
            </span>

            <h1>
              Look Good. Feel Beautiful.
              <span>Smell Amazing, Stay Sleek.</span>
            </h1>

            <p>
              Welcome to {BRAND.name} — your trusted destination for premium
              skincare, fragrances and stylish accessories at prices that feel
              good.
            </p>

            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary">
                Shop the collection
                <FiArrowRight />
              </Link>

              <Link to="/about" className="btn btn-secondary">
                Our story
              </Link>
            </div>

            <div className="hero-trust">
              <div className="hero-rating">
                <div className="hero-stars">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
                <span>Authentic products, selected with care</span>
              </div>

              <span className="hero-trust-divider" />

              <span className="hero-trust-text">
                {BRAND.city} • Fast delivery
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src="/images/deck/ginseng.jpg"
                alt="Sleek Sisters ginseng skincare and lifestyle products"
                className="hero-image"
              />
            </div>

            <div className="hero-floating-card">
              <span className="floating-label">{BRAND.name.toUpperCase()}</span>
              <strong>Smell Amazing.</strong>
              <strong>Stay Sleek.</strong>
              <Link to="/shop">
                Discover
                <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="categories-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">Our product categories</span>
              <h2>
                Five categories,
                <span> one promise of elegance.</span>
              </h2>
            </div>

            <Link to="/shop" className="view-all">
              View all products
              <FiArrowRight />
            </Link>
          </div>

          <div className="categories-grid sleek-categories">
            {HOME_CATEGORIES.map((category, index) => (
              <Link
                key={category.slug}
                to={`/shop?category=${category.slug}`}
                className="category-card"
              >
                <div className="category-image">
                  <img src={category.image} alt={category.name} />
                </div>

                <div className="category-card-top">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <FiArrowRight />
                </div>

                <div className="category-card-content">
                  <span className="category-number">{category.label}</span>
                  <h3>{category.name}</h3>
                  <p>{category.copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">JUST IN</span>
              <h2>
                New products
                <span> on the shelf.</span>
              </h2>
            </div>

            <Link to="/shop" className="view-all">
              Shop all
              <FiArrowRight />
            </Link>
          </div>

          <HomeProductGrid
            products={newArrivals}
            badge="NEW"
            isInWishlist={isInWishlist}
            toggleWishlist={toggleWishlist}
          />
        </div>
      </section>

      <section className="featured-section bestsellers-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">MOST LOVED</span>
              <h2>
                Best selling
                <span> and most requested.</span>
              </h2>
            </div>

            <Link to="/shop" className="view-all">
              Shop all
              <FiArrowRight />
            </Link>
          </div>

          <HomeProductGrid
            products={bestsellers}
            badge="POPULAR"
            isInWishlist={isInWishlist}
            toggleWishlist={toggleWishlist}
          />
        </div>
      </section>

      <section className="why-jawabu-section">
        <div className="container">
          <div className="why-jawabu-heading">
            <div>
              <span className="section-eyebrow">Our advantage</span>
              <h2>
                Why choose
                <span> Sleek Sisters?</span>
              </h2>
            </div>
            <p>
              We believe every individual deserves to look good, feel confident
              and enjoy quality products at affordable prices.
            </p>
          </div>

          <div className="benefits-grid sleek-benefits">
            {ADVANTAGES.map((item) => (
              <div className="benefit-card" key={item.number}>
                <span className="benefit-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="brand-story-section">
        <div className="container">
          <div className="brand-story-grid">
            <div className="brand-story-image">
              <img
                src="/images/deck/moisturizer.jpg"
                alt="Sleek Sisters skincare collection"
              />
              <div className="brand-story-image-content">
                <span>{BRAND.wordmark}</span>
                <p>BEAUTY • SKINCARE • FRAGRANCE • FASHION</p>
              </div>
            </div>

            <div className="brand-story-content">
              <span className="section-eyebrow">OUR STORY</span>
              <h2>
                Healthy skin.
                <span> A lasting impression.</span>
              </h2>
              <p className="brand-story-lead">
                {BRAND.name} is a one-stop destination for authentic skincare,
                fragrance, body mists, bags and gift packages.
              </p>
              <p>
                Our products are chosen to help you achieve healthy skin, smell
                amazing and complete your everyday look with elegance — with
                service that actually helps you choose.
              </p>
              <Link to="/about" className="brand-story-link">
                Read our mission
                <FiArrowRight />
              </Link>
            </div>
          </div>

          <div className="brand-philosophy">
            <div className="philosophy-item">
              <span>01</span>
              <strong>BEAUTY</strong>
              <p>Look good and feel confident in products made for real routines.</p>
            </div>
            <div className="philosophy-item">
              <span>02</span>
              <strong>FRAGRANCE</strong>
              <p>Leave a lasting impression with scents for every day and night.</p>
            </div>
            <div className="philosophy-item">
              <span>03</span>
              <strong>FASHION</strong>
              <p>Finish the look with bags, gifts and accessories that travel well.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-card">
            <div className="newsletter-content">
              <span className="section-eyebrow">Thank you</span>
              <h2>
                Order today.
                <span> Let your beauty shine.</span>
              </h2>
              <p>
                Be the first to hear about new skincare, fragrances and offers
                from {BRAND.name}. Leave your email for a Sleek Sisters message
                when something new lands, or your phone for an SMS with a link.
              </p>
            </div>

            <form className="newsletter-form" onSubmit={handleNewsletter}>
              <div className="newsletter-input-wrapper">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your email address"
                  aria-label="Email address"
                />
              </div>
              <div className="newsletter-input-wrapper">
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0712 345 678"
                  aria-label="Phone number for SMS alerts"
                />
                <button type="submit" className="newsletter-submit">
                  Subscribe
                  <FiArrowRight />
                </button>
              </div>
              {newsletterStatus ? <p>{newsletterStatus}</p> : null}
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

function HomeProductGrid({ products, badge, isInWishlist, toggleWishlist }) {
  if (!products.length) {
    return null
  }

  return (
    <div className="products-grid">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          <div className="product-image">
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
            {badge ? <span className="product-badge">{badge}</span> : null}
            <button
              type="button"
              className="product-wishlist"
              aria-label={`Save ${product.name}`}
              onClick={() => toggleWishlist(product)}
            >
              <FiHeart
                fill={isInWishlist(product.id) ? 'currentColor' : 'none'}
              />
            </button>
          </div>

          <div className="product-info">
            <span className="product-category">{product.category || 'Sleek Sisters'}</span>
            <h3>
              <Link to={`/product/${product.id}`}>{product.name}</Link>
            </h3>
            <div className="product-bottom">
              <strong>KSh {Number(product.price || 0).toLocaleString()}</strong>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export default Home
