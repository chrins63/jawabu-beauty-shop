import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">JAWABU BEAUTY</span>
          <h1>Privacy policy</h1>
          <p>
            We collect the name, phone, email, and delivery address you enter
            at checkout so we can fulfil your order. If you create an account,
            authentication is handled by our identity provider.
          </p>
          <p>
            We do not sell customer lists. Payment details are processed by
            the payment provider; we store payment status and provider
            references, not M-Pesa PINs or full card numbers.
          </p>
          <p>
            To request a copy or deletion of your account data, contact us via
            the <Link to="/about">About</Link> page.
          </p>
        </div>
      </section>
    </main>
  );
}
