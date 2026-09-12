import { Link } from 'react-router-dom'
import { BRAND } from '../lib/brand'

const About = () => {
  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">{BRAND.name.toUpperCase()}</span>
          <h1>About us</h1>
          <p>
            Welcome to {BRAND.name}. Your trusted destination for premium
            skincare, fragrances and stylish accessories.
          </p>
          <p>
            We believe that every individual deserves to look good, feel
            confident and enjoy quality products at affordable prices. Our
            carefully selected products are designed to help you achieve
            healthy skin, smell amazing and complete your everyday look with
            elegance.
          </p>

          <h2>Our mission</h2>
          <p>
            To provide authentic, high-quality beauty and lifestyle products
            that enhance confidence and promote self-care.
          </p>

          <h2>What we sell</h2>
          <p>
            Skincare, perfumes and colognes, body mists, handbags and sling
            bags, and gift packages — five categories, one promise of elegance.
          </p>

          <h2>Our customer promise</h2>
          <p>
            Customer satisfaction is our priority. We are committed to helping
            you choose products that suit your beauty needs while providing
            exceptional service every step of the way. Fast, reliable delivery
            comes as standard.
          </p>

          <p>
            {BRAND.closing}
          </p>

          <p>
            <Link to="/shop">Shop the collection</Link>
            {' · '}
            <Link to="/contact">Contact us</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default About
