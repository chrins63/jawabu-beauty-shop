import { Link } from 'react-router-dom'

export default function BrandLogo({
  to = '/',
  compact = false,
  onClick,
}) {
  return (
    <Link to={to} className="brand-logo" onClick={onClick}>
      <img
        src="/images/brand/logo-mark.png"
        alt=""
        className="brand-logo-mark"
      />
      {compact ? (
        <span className="visually-hidden">Sleek Sisters</span>
      ) : (
        <span className="brand-logo-copy">
          <span className="brand-logo-name">Sleek_Sisters</span>
          <span className="brand-logo-tagline">Grace in Every Detail</span>
        </span>
      )}
    </Link>
  )
}
