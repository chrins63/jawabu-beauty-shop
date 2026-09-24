import { NavLink } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { navItemsForRole } from '../lib/access';

/*
=========================================================
SLEEK SISTERS ADMIN — SIDEBAR
=========================================================
*/

function Icon({ name, size = 20 }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case 'pos':
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M7 20h10" />
          <path d="M9 17v3" />
          <path d="M15 17v3" />
          <path d="M7 8h10" />
          <path d="M7 12h3" />
          <path d="M13 12h4" />
        </svg>
      );

    case 'orders':
      return (
        <svg {...commonProps}>
          <path d="M6 3h12" />
          <path d="M6 6h12" />
          <path d="M6 3v3" />
          <path d="M18 3v3" />
          <path d="M5 6h14l-1 14H6L5 6Z" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
          <path d="M9 18h3" />
        </svg>
      );

    case 'products':
      return (
        <svg {...commonProps}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="M12 12v9" />
          <path d="m8 5.2 8 4.5" />
        </svg>
      );

    case 'categories':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    case 'inventory':
      return (
        <svg {...commonProps}>
          <path d="M4 5h16v15H4z" />
          <path d="M8 3h8v4H8z" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
          <path d="M8 19h3" />
        </svg>
      );

    case 'customers':
      return (
        <svg {...commonProps}>
          <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M17 11a3.5 3.5 0 1 0-1.2-6.8" />
          <path d="M21 20v-1.5a4 4 0 0 0-3-3.87" />
        </svg>
      );

    case 'inbox':
      return (
        <svg {...commonProps}>
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );

    case 'services':
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 9h16" />
        </svg>
      );

    case 'payments':
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
          <path d="M15 15h2" />
        </svg>
      );

    case 'staff':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
          <path d="M5 11a3 3 0 0 1 0-6" />
          <path d="M19 11a3 3 0 0 0 0-6" />
        </svg>
      );

    case 'reports':
      return (
        <svg {...commonProps}>
          <path d="M4 19V5" />
          <path d="M4 19h17" />
          <path d="m7 15 4-4 3 2 5-6" />
          <circle cx="7" cy="15" r="1" />
          <circle cx="11" cy="11" r="1" />
          <circle cx="14" cy="13" r="1" />
          <circle cx="19" cy="7" r="1" />
        </svg>
      );

    case 'settings':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.67 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03h.04v2.4h-.04A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );

    default:
      return null;
  }
}

function Sidebar({ onNavigate }) {
  const { profile } = useAuth();
  const navigation = navItemsForRole(profile?.role);

  return (
    <aside className="sidebar">

      {/* =====================================================
          LOGO
      ====================================================== */}

      <div className="sidebar-logo" onClick={() => onNavigate?.()}>
        <BrandLogo />
        <span>ADMIN</span>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav className="sidebar-nav">

        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? 'active' : ''
              } ${item.highlight ? 'pos-link' : ''}`
            }
            onClick={() => onNavigate?.()}
          >

            <span className="sidebar-icon">
              <Icon name={item.icon} size={20} />
            </span>

            <span className="sidebar-label">
              {item.label}
            </span>

          </NavLink>
        ))}

      </nav>

    </aside>
  );
}

export default Sidebar;