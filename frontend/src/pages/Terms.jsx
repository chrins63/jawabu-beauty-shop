import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">JAWABU BEAUTY</span>
          <h1>Terms of use</h1>
          <p>
            These terms govern use of the Jawabu Beauty website and in-store
            purchases placed through this shop. By placing an order you confirm
            that the delivery details you provide are accurate.
          </p>
          <p>
            Product availability and prices are confirmed when the order is
            accepted. Payment is collected through M-Pesa or at the counter.
            An order is not complete until payment is confirmed.
          </p>
          <p>
            For questions, contact the salon using the details on the
            {" "}
            <Link to="/about">About</Link> page.
          </p>
        </div>
      </section>
    </main>
  );
}
