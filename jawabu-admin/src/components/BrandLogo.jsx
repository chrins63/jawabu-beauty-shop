import { Link } from 'react-router-dom'
import { publicAsset } from '../lib/assets'

export default function BrandLogo({
  to = '/',
  compact = false,
}) {
  return (
    <Link to={to} className="brand-logo">
      <img
        src={publicAsset('images/brand/logo-mark.png')}
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
