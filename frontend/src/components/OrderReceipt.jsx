import { Link } from 'react-router-dom'

function formatMoney(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusLabel(value) {
  const key = String(value || '').toLowerCase()
  if (key === 'paid' || key === 'completed' || key === 'success') return 'Paid'
  if (key === 'processing') return 'Being prepared'
  if (key === 'shipped' || key === 'dispatched') return 'On the way'
  if (key === 'delivered') return 'Delivered'
  if (key === 'cancelled') return 'Cancelled'
  if (key === 'pending') return 'Pending'
  return value || 'Pending'
}

export default function OrderReceipt({ order }) {
  const items = order.items || []
  const trackTo =
    order.order_number && order.phone
      ? `/track?order=${encodeURIComponent(order.order_number)}&phone=${encodeURIComponent(order.phone)}`
      : '/track'

  return (
    <article className="order-receipt">
      <header className="order-receipt-head">
        <div>
          <span className="account-eyebrow">ORDER</span>
          <h2>{order.order_number || `Order #${order.id}`}</h2>
          <p>{formatDate(order.created_at || order.order_date)}</p>
        </div>
        <div className="order-receipt-status">
          <span>{statusLabel(order.payment_status)}</span>
          <span>{statusLabel(order.status)}</span>
        </div>
      </header>

      <ul className="order-receipt-items">
        {items.length === 0 ? (
          <li className="order-receipt-empty">Products for this order are not listed yet.</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <Link to={item.productId ? `/product/${item.productId}` : '/shop'}>
                <img src={item.image} alt={item.name} />
              </Link>
              <div>
                <strong>{item.name}</strong>
                {item.variantLabel ? <span>{item.variantLabel}</span> : null}
                <span>Qty {item.quantity}</span>
              </div>
              <strong>{formatMoney(item.price * item.quantity)}</strong>
            </li>
          ))
        )}
      </ul>

      <footer className="order-receipt-foot">
        {Number(order.delivery_fee) > 0 ? (
          <p>
            Delivery <strong>{formatMoney(order.delivery_fee)}</strong>
          </p>
        ) : null}
        <p className="order-receipt-total">
          Total <strong>{formatMoney(order.total_amount ?? order.total)}</strong>
        </p>
        <Link to={trackTo} className="account-order-track">
          Track this order
        </Link>
      </footer>
    </article>
  )
}
