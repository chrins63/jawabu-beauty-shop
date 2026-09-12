import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatOrderCustomer } from '../lib/phone';

function Topbar({ navOpen = false, onMenu }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef(null);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      const orFilters = [
        `order_number.ilike.%${term}%`,
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `email.ilike.%${term}%`,
      ];

      if (/^\d+$/.test(term)) {
        orFilters.push(`id.eq.${term}`);
      }

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, first_name, last_name, phone, email, status, payment_status, total_amount, sales_channel, created_at'
        )
        .or(orFilters.join(','))
        .order('created_at', { ascending: false })
        .limit(8);

      if (cancelled) {
        return;
      }

      setSearching(false);
      setResults(error ? [] : data || []);
      setOpen(true);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const openOrder = (order) => {
    const number = order.order_number || String(order.id);
    setQuery(number);
    setOpen(false);
    navigate(`/orders?order=${encodeURIComponent(number)}`);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const term = query.trim();

    if (!term) {
      return;
    }

    if (results[0]) {
      openOrder(results[0]);
      return;
    }

    navigate(`/orders?order=${encodeURIComponent(term)}`);
    setOpen(false);
  };

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-menu-btn"
        aria-label={navOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={navOpen}
        onClick={onMenu}
      >
        {navOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <div className="topbar-brand">
        <h1>Sleek Sisters Admin</h1>
        <p>Grace in Every Detail</p>
      </div>

      <form className="topbar-search" onSubmit={submitSearch} ref={boxRef}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Track order number…"
          aria-label="Track order number"
        />

        {open && query.trim().length >= 2 && (
          <div className="topbar-search-results">
            {searching ? (
              <p className="topbar-search-empty">Searching orders…</p>
            ) : results.length === 0 ? (
              <p className="topbar-search-empty">No order matches that number.</p>
            ) : (
              results.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className="topbar-search-item"
                  onClick={() => openOrder(order)}
                >
                  <strong>{order.order_number || `#${order.id}`}</strong>
                  <span>
                    Placed by {formatOrderCustomer(order)}
                    {order.phone ? ` · ${order.phone}` : ''}
                    {order.email ? ` · ${order.email}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </form>

      <div className="topbar-right">
        <div className="user-info">
          <strong>
            {profile?.first_name || 'Admin'} {profile?.last_name || ''}
          </strong>
          <span>{user?.email || profile?.phone}</span>
          <small>{profile?.role || 'Staff'}</small>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
