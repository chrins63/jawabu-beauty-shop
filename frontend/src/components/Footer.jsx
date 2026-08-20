import { Link } from 'react-router-dom'
import {
  FiInstagram,
  FiFacebook,
  FiMusic,
  FiArrowUp
} from 'react-icons/fi'

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <footer className="site-footer">

      <div className="container">

        {/* =========================
            FOOTER MAIN
        ========================= */}

        <div className="footer-main">

          {/* BRAND */}

          <div className="footer-brand">

            <Link
              to="/"
              className="footer-logo"
            >
              JAWABU
            </Link>

            <p className="footer-description">
              Beauty products, professional services and
              thoughtful self-care — all in one place.
            </p>

            <div className="footer-socials">

              <a
                href="#"
                className="footer-social"
                aria-label="Instagram"
              >
                <FiInstagram />
                <span>Instagram</span>
              </a>

              <a
                href="#"
                className="footer-social"
                aria-label="Facebook"
              >
                <FiFacebook />
                <span>Facebook</span>
              </a>

              <a
                href="#"
                className="footer-social"
                aria-label="TikTok"
              >
                <FiMusic />
                <span>TikTok</span>
              </a>

            </div>

          </div>


          {/* SHOP */}

          <div className="footer-column">

            <h3>Shop</h3>

            <Link to="/shop">
              All Products
            </Link>

            <Link to="/shop?category=skincare">
              Skincare
            </Link>

            <Link to="/shop?category=hair">
              Hair Care
            </Link>

            <Link to="/shop?category=makeup">
              Makeup
            </Link>

            <Link to="/shop?category=fragrance">
              Fragrance
            </Link>

          </div>


          {/* SERVICES */}

          <div className="footer-column">

            <h3>Services</h3>

            <Link to="/services">
              Hair & Styling
            </Link>

            <Link to="/services">
              Nails
            </Link>

            <Link to="/services">
              Skincare & Facial
            </Link>

            <Link to="/services">
              Makeup
            </Link>

            <Link to="/services">
              Book Appointment
            </Link>

          </div>


          {/* JAWABU */}

          <div className="footer-column">

            <h3>Jawabu</h3>

            <Link to="/about">
              Our Story
            </Link>

            <Link to="/contact">
              Contact
            </Link>

            <Link to="/login">
              My Account
            </Link>

            <Link to="/orders">
              Track Order
            </Link>

          </div>

        </div>


        {/* =========================
            FOOTER BOTTOM
        ========================= */}

        <div className="footer-bottom">

          <p>
            © {new Date().getFullYear()} Jawabu Beauty Shop.
            All rights reserved.
          </p>

          <div className="footer-bottom-links">

            <Link to="/privacy">
              Privacy
            </Link>

            <Link to="/terms">
              Terms
            </Link>

            <button
              type="button"
              onClick={scrollToTop}
              className="back-to-top"
            >
              Back to top
              <FiArrowUp />
            </button>

          </div>

        </div>

      </div>

    </footer>
  )
}

export default Footer
