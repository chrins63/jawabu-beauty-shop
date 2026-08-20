const Hero = () => {
  return (
    <section className="hero">
      <div className="container hero-container">

        <div className="hero-content">
          <span className="hero-eyebrow">
            BEAUTY • CARE • CONFIDENCE
          </span>

          <h1>
            Beauty that
            <span> feels like you.</span>
          </h1>

          <p>
            Discover carefully selected beauty products
            and professional services designed to help
            you look and feel your best.
          </p>

          <div className="hero-actions">
            <a href="/shop" className="btn btn-primary">
              Shop Products
            </a>

            <a href="/services" className="btn btn-secondary">
              Book a Service
            </a>
          </div>
        </div>

        <div className="hero-image">
          <div className="hero-image-placeholder">
            Jawabu Beauty
          </div>
        </div>

      </div>
    </section>
  )
}

export default Hero