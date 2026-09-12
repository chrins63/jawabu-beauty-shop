import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiInstagram,
  FiArrowUp
} from 'react-icons/fi'
import { BRAND, HOME_CATEGORIES } from '../lib/brand'
import { getStorefrontCommerce } from '../lib/storefront'
import { whatsappHref, defaultWhatsAppText } from '../lib/whatsapp'

const Footer = () => {
  const [whatsapp, setWhatsapp] = useState(
    whatsappHref(BRAND.phone, defaultWhatsAppText())
  )

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setWhatsapp(
        whatsappHref(data.whatsapp_number || BRAND.phone, defaultWhatsAppText())
      )
    })
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img
                src="/images/brand/logo-mark.png"
                alt=""
                className="footer-logo-mark"
              />
              <span>
                <strong>Sleek_Sisters</strong>
                <em>Grace in Every Detail</em>
              </span>
            </Link>

            <p className="footer-description">
              {BRAND.promise}. Authentic skincare, fragrance, bags and gifts.
            </p>

            <div className="footer-socials">
              <a
                href={BRAND.instagramUrl}
                className="footer-social"
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
              >
                <FiInstagram />
                <span>{BRAND.instagramHandle}</span>
              </a>
              <a
                href={whatsapp}
                className="footer-social"
                aria-label="WhatsApp"
                target="_blank"
                rel="noreferrer"
              >
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="footer-column">
            <h3>Shop</h3>
            <Link to="/shop">All Products</Link>
            <Link to="/track">Track order</Link>
            {HOME_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                to={`/shop?category=${category.slug}`}
              >
                {category.name}
              </Link>
            ))}
          </div>

          <div className="footer-column">
            <h3>Help</h3>
            <Link to="/contact">Contact</Link>
            <Link to="/track">Track Order</Link>
            <Link to="/account">My Account</Link>
            <a href={BRAND.phoneHref}>{BRAND.phone}</a>
          </div>

          <div className="footer-column">
            <h3>{BRAND.name}</h3>
            <Link to="/about">Our Story</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href={BRAND.instagramUrl} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>

          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
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
