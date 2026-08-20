import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiHeart,
  FiStar
} from 'react-icons/fi'

const Home = () => {
  return (
    <div className="home-page">

      {/* =====================================================
          HERO SECTION
      ===================================================== */}

      <section className="hero">

        <div className="container hero-container">

          <div className="hero-content">

            <span className="hero-eyebrow">
              BEAUTY • CARE • CONFIDENCE
            </span>

            <h1>
              Beauty that
              <span>feels personal.</span>
            </h1>

            <p>
              Discover carefully selected beauty products and
              professional services designed to help you look
              good, feel confident and enjoy your routine.
            </p>

            <div className="hero-actions">

              <Link
                to="/shop"
                className="btn btn-primary"
              >
                Shop Products
                <FiArrowRight />
              </Link>

              <Link
                to="/services"
                className="btn btn-secondary"
              >
                Explore Services
              </Link>

              <Link
                to="/login"
                className="btn btn-secondary"
              >
                Sign In
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

                <span>
                  Beauty made personal
                </span>

              </div>

              <span className="hero-trust-divider" />

              <span className="hero-trust-text">
                Nairobi • Kenya
              </span>

            </div>

          </div>


          <div className="hero-visual">

            <div className="hero-image-frame">

              <div className="hero-image-placeholder">

                <span className="hero-placeholder-brand">
                  JAWABU
                </span>

                <span className="hero-placeholder-subtitle">
                  BEAUTY • CARE • CONFIDENCE
                </span>

              </div>

            </div>


            <div className="hero-floating-card">

              <span className="floating-label">
                THE JAWABU EDIT
              </span>

              <strong>
                Your beauty.
              </strong>

              <strong>
                Your moment.
              </strong>

              <Link to="/shop">
                Discover
                <FiArrowRight />
              </Link>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          SHOP BY CATEGORY
      ===================================================== */}

      <section className="categories-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <span className="section-eyebrow">
                SHOP BY CATEGORY
              </span>

              <h2>
                Find your
                <span>beauty essentials.</span>
              </h2>

            </div>

            <Link
              to="/shop"
              className="view-all"
            >
              View all products
              <FiArrowRight />
            </Link>

          </div>


          <div className="categories-grid">

            <Link
              to="/shop?category=skincare"
              className="category-card"
            >

              <div className="category-card-top">
                <span>01</span>
                <FiArrowRight />
              </div>

              <div className="category-card-content">

                <span className="category-number">
                  SKINCARE
                </span>

                <h3>
                  Skincare
                </h3>

                <p>
                  Care for your everyday glow.
                </p>

              </div>

            </Link>


            <Link
              to="/shop?category=hair"
              className="category-card"
            >

              <div className="category-card-top">
                <span>02</span>
                <FiArrowRight />
              </div>

              <div className="category-card-content">

                <span className="category-number">
                  HAIR CARE
                </span>

                <h3>
                  Hair Care
                </h3>

                <p>
                  Products for beautiful hair.
                </p>

              </div>

            </Link>


            <Link
              to="/shop?category=makeup"
              className="category-card"
            >

              <div className="category-card-top">
                <span>03</span>
                <FiArrowRight />
              </div>

              <div className="category-card-content">

                <span className="category-number">
                  MAKEUP
                </span>

                <h3>
                  Makeup
                </h3>

                <p>
                  Express your personal style.
                </p>

              </div>

            </Link>


            <Link
              to="/shop?category=fragrance"
              className="category-card"
            >

              <div className="category-card-top">
                <span>04</span>
                <FiArrowRight />
              </div>

              <div className="category-card-content">

                <span className="category-number">
                  FRAGRANCE
                </span>

                <h3>
                  Fragrance
                </h3>

                <p>
                  Find a scent that feels like you.
                </p>

              </div>

            </Link>

          </div>

        </div>

      </section>


      {/* =====================================================
          FEATURED PRODUCTS
      ===================================================== */}

      <section className="featured-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <span className="section-eyebrow">
                JAWABU EDIT
              </span>

              <h2>
                Featured
                <span>beauty picks.</span>
              </h2>

            </div>

            <Link
              to="/shop"
              className="view-all"
            >
              Shop all
              <FiArrowRight />
            </Link>

          </div>


          <div className="products-grid">

            {/* PRODUCT 1 */}

            <article className="product-card">

              <div className="product-image">

                <span>
                  PRODUCT IMAGE
                </span>

                <button
                  type="button"
                  className="product-wishlist"
                  aria-label="Add to wishlist"
                >
                  <FiHeart />
                </button>

                <span className="product-badge">
                  FEATURED
                </span>

              </div>

              <div className="product-info">

                <span className="product-category">
                  SKINCARE
                </span>

                <h3>
                  Daily Glow Essentials
                </h3>

                <p className="product-description">
                  Everyday essentials for a thoughtful skincare routine.
                </p>

                <div className="product-bottom">

                  <strong>
                    KSh 1,500
                  </strong>

                  <Link to="/shop">
                    View
                    <FiArrowRight />
                  </Link>

                </div>

              </div>

            </article>


            {/* PRODUCT 2 */}

            <article className="product-card">

              <div className="product-image">

                <span>
                  PRODUCT IMAGE
                </span>

                <button
                  type="button"
                  className="product-wishlist"
                  aria-label="Add to wishlist"
                >
                  <FiHeart />
                </button>

              </div>

              <div className="product-info">

                <span className="product-category">
                  HAIR CARE
                </span>

                <h3>
                  Nourishing Hair Care
                </h3>

                <p className="product-description">
                  Carefully selected products for your hair routine.
                </p>

                <div className="product-bottom">

                  <strong>
                    KSh 1,200
                  </strong>

                  <Link to="/shop">
                    View
                    <FiArrowRight />
                  </Link>

                </div>

              </div>

            </article>


            {/* PRODUCT 3 */}

            <article className="product-card">

              <div className="product-image">

                <span>
                  PRODUCT IMAGE
                </span>

                <button
                  type="button"
                  className="product-wishlist"
                  aria-label="Add to wishlist"
                >
                  <FiHeart />
                </button>

                <span className="product-badge">
                  NEW
                </span>

              </div>

              <div className="product-info">

                <span className="product-category">
                  FRAGRANCE
                </span>

                <h3>
                  Signature Scent
                </h3>

                <p className="product-description">
                  Find a fragrance that complements your personal style.
                </p>

                <div className="product-bottom">

                  <strong>
                    KSh 2,500
                  </strong>

                  <Link to="/shop">
                    View
                    <FiArrowRight />
                  </Link>

                </div>

              </div>

            </article>


            {/* PRODUCT 4 */}

            <article className="product-card">

              <div className="product-image">

                <span>
                  PRODUCT IMAGE
                </span>

                <button
                  type="button"
                  className="product-wishlist"
                  aria-label="Add to wishlist"
                >
                  <FiHeart />
                </button>

              </div>

              <div className="product-info">

                <span className="product-category">
                  MAKEUP
                </span>

                <h3>
                  Everyday Beauty
                </h3>

                <p className="product-description">
                  Beauty essentials for effortless everyday looks.
                </p>

                <div className="product-bottom">

                  <strong>
                    KSh 1,800
                  </strong>

                  <Link to="/shop">
                    View
                    <FiArrowRight />
                  </Link>

                </div>

              </div>

            </article>

          </div>

        </div>

      </section>


      {/* =====================================================
          WHY JAWABU
      ===================================================== */}

      <section className="why-jawabu-section">

        <div className="container">

          <div className="why-jawabu-heading">

            <div>

              <span className="section-eyebrow">
                THE JAWABU STANDARD
              </span>

              <h2>
                Beauty shopping,
                <span>done differently.</span>
              </h2>

            </div>

            <p>
              We bring together carefully selected beauty products
              and professional services so you can discover, shop
              and care for yourself with confidence.
            </p>

          </div>


          <div className="benefits-grid">

            <div className="benefit-card">

              <span className="benefit-number">
                01
              </span>

              <h3>
                Carefully Selected
              </h3>

              <p>
                We focus on products chosen with quality,
                usefulness and everyday beauty routines in mind.
              </p>

            </div>


            <div className="benefit-card">

              <span className="benefit-number">
                02
              </span>

              <h3>
                Beauty With Purpose
              </h3>

              <p>
                Discover products designed to fit naturally
                into your beauty routine.
              </p>

            </div>


            <div className="benefit-card">

              <span className="benefit-number">
                03
              </span>

              <h3>
                Professional Services
              </h3>

              <p>
                Go beyond shopping with beauty services designed
                around your needs.
              </p>

            </div>


            <div className="benefit-card">

              <span className="benefit-number">
                04
              </span>

              <h3>
                Simple Shopping
              </h3>

              <p>
                Browse, choose, add to your bag and manage your
                orders from one simple experience.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          BEAUTY SERVICES
      ===================================================== */}

      <section className="beauty-services-section">

        <div className="container">

          <div className="services-section-header">

            <div>

              <span className="section-eyebrow">
                JAWABU BEAUTY STUDIO
              </span>

              <h2>
                Your beauty,
                <span>your moment.</span>
              </h2>

            </div>

            <div className="services-header-side">

              <p>
                Take time for yourself. Discover professional
                beauty services designed to help you look polished,
                feel confident and leave feeling refreshed.
              </p>

              <Link
                to="/services"
                className="view-all"
              >
                View all services
                <FiArrowRight />
              </Link>

            </div>

          </div>


          <div className="services-list">

            <Link
              to="/services"
              className="service-row"
            >

              <span className="service-number">
                01
              </span>

              <div className="service-main">

                <h3>
                  Hair & Styling
                </h3>

                <p>
                  Styling, treatments and professional hair care
                  tailored to your look.
                </p>

              </div>

              <span className="service-price">
                From KSh 800
              </span>

              <span className="service-arrow">
                <FiArrowRight />
              </span>

            </Link>


            <Link
              to="/services"
              className="service-row"
            >

              <span className="service-number">
                02
              </span>

              <div className="service-main">

                <h3>
                  Nails
                </h3>

                <p>
                  Beautiful, polished nails with professional
                  care and attention to detail.
                </p>

              </div>

              <span className="service-price">
                From KSh 700
              </span>

              <span className="service-arrow">
                <FiArrowRight />
              </span>

            </Link>


            <Link
              to="/services"
              className="service-row"
            >

              <span className="service-number">
                03
              </span>

              <div className="service-main">

                <h3>
                  Skincare & Facial
                </h3>

                <p>
                  Relaxing facial treatments and skincare designed
                  around your routine.
                </p>

              </div>

              <span className="service-price">
                From KSh 1,000
              </span>

              <span className="service-arrow">
                <FiArrowRight />
              </span>

            </Link>


            <Link
              to="/services"
              className="service-row"
            >

              <span className="service-number">
                04
              </span>

              <div className="service-main">

                <h3>
                  Makeup
                </h3>

                <p>
                  Professional makeup for everyday looks,
                  celebrations and special occasions.
                </p>

              </div>

              <span className="service-price">
                From KSh 1,500
              </span>

              <span className="service-arrow">
                <FiArrowRight />
              </span>

            </Link>

          </div>


          <div className="services-booking-cta">

            <div>

              <span className="section-eyebrow">
                READY WHEN YOU ARE
              </span>

              <h3>
                Make time for yourself.
              </h3>

            </div>

            <Link
              to="/services"
              className="btn btn-primary"
            >
              Book an Appointment
              <FiArrowRight />
            </Link>

          </div>

        </div>

      </section>


      {/* =====================================================
          JAWABU BRAND STORY
      ===================================================== */}

      <section className="brand-story-section">

        <div className="container">

          <div className="brand-story-grid">

            <div className="brand-story-image">

              <div className="brand-story-image-content">

                <span>
                  JAWABU
                </span>

                <p>
                  BEAUTY • CARE • CONFIDENCE
                </p>

              </div>

            </div>


            <div className="brand-story-content">

              <span className="section-eyebrow">
                OUR STORY
              </span>

              <h2>
                Beauty should
                <span>feel personal.</span>
              </h2>

              <p className="brand-story-lead">
                Jawabu is being built as a beauty destination
                where discovering products and taking care of
                yourself can feel simple, personal and enjoyable.
              </p>

              <p>
                From everyday beauty essentials to professional
                services, our goal is to bring everything together
                in one thoughtful experience.
              </p>

              <p>
                Whether you are refreshing your routine, preparing
                for something special or simply taking a moment
                for yourself, Jawabu is designed to make beauty
                feel accessible and intentional.
              </p>

              <Link
                to="/about"
                className="brand-story-link"
              >
                Discover Jawabu
                <FiArrowRight />
              </Link>

            </div>

          </div>


          <div className="brand-philosophy">

            <div className="philosophy-item">

              <span>
                01
              </span>

              <strong>
                BEAUTY
              </strong>

              <p>
                Discover products and experiences that fit your
                personal routine.
              </p>

            </div>


            <div className="philosophy-item">

              <span>
                02
              </span>

              <strong>
                CARE
              </strong>

              <p>
                Make space for thoughtful self-care and
                professional beauty services.
              </p>

            </div>


            <div className="philosophy-item">

              <span>
                03
              </span>

              <strong>
                CONFIDENCE
              </strong>

              <p>
                Feel good about the way you express and care
                for yourself.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          NEWSLETTER
      ===================================================== */}

      <section className="newsletter-section">

        <div className="container">

          <div className="newsletter-card">

            <div className="newsletter-content">

              <span className="section-eyebrow">
                STAY IN THE LOOP
              </span>

              <h2>
                Beauty updates,
                <span>delivered.</span>
              </h2>

              <p>
                Be the first to discover new products, beauty
                tips, special offers and updates from Jawabu.
              </p>

            </div>


            <form
              className="newsletter-form"
              onSubmit={(event) => event.preventDefault()}
            >

              <div className="newsletter-input-wrapper">

                <input
                  type="email"
                  placeholder="Your email address"
                  aria-label="Email address"
                />

                <button
                  type="submit"
                  className="newsletter-submit"
                >
                  Subscribe
                  <FiArrowRight />
                </button>

              </div>

              <small>
                By subscribing, you agree to receive updates
                from Jawabu.
              </small>

            </form>

          </div>

        </div>

      </section>

    </div>
  )
}

export default Home