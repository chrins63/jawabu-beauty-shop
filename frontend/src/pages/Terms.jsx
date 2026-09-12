import { Link } from "react-router-dom";
import { BRAND } from "../lib/brand";

export default function Terms() {
  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">{BRAND.name.toUpperCase()}</span>
          <h1>Terms of use</h1>
          <p>
            These terms govern use of the {BRAND.name} website and purchases
            placed through this shop. By placing an order you confirm that the
            delivery details you provide are accurate.
          </p>
          <p>
            Product availability and prices are confirmed when the order is
            accepted. Payment is collected through M-Pesa or at the counter.
            An order is not complete until payment is confirmed.
          </p>
          <p>
            For questions, contact {BRAND.name} on {BRAND.phone}, Instagram{" "}
            {BRAND.instagramHandle}, or the{" "}
            <Link to="/contact">Contact</Link> page.
          </p>
        </div>
      </section>
    </main>
  );
}
