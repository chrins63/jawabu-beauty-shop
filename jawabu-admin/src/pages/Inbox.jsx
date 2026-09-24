import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './adminPages.css';

const TABS = [
  { id: 'messages', label: 'Messages' },
  { id: 'email', label: 'Email signups' },
  { id: 'sms', label: 'SMS signups' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'bookings', label: 'Bookings' },
];

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Inbox() {
  const [tab, setTab] = useState('messages');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextTab = tab) => {
    setLoading(true);
    setError('');

    let query;
    if (nextTab === 'messages') {
      query = supabase
        .from('contact_messages')
        .select('id, name, email, phone, message, created_at')
        .order('created_at', { ascending: false });
    } else if (nextTab === 'email') {
      query = supabase
        .from('newsletter_subscribers')
        .select('id, email, name, source, created_at')
        .order('created_at', { ascending: false });
    } else if (nextTab === 'sms') {
      query = supabase
        .from('sms_subscribers')
        .select('id, phone, name, source, created_at')
        .order('created_at', { ascending: false });
    } else if (nextTab === 'reviews') {
      query = supabase
        .from('customer_reviews')
        .select('id, product_id, rating, comment, created_at, products(name)')
        .order('created_at', { ascending: false });
    } else {
      query = supabase
        .from('bookings')
        .select('id, customer_name, email, phone, booking_date, start_time, status, services(name)')
        .order('booking_date', { ascending: false });
    }

    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message || 'Could not load this list.');
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const removeReview = async (id) => {
    const { error: deleteError } = await supabase
      .from('customer_reviews')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message || 'Could not remove that review.');
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const updateBooking = async (id, status) => {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message || 'Could not update that booking.');
      return;
    }
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row))
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Inbox</h1>
          <p>Contact messages, signups, product reviews, and service bookings.</p>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'admin-tab is-active' : 'admin-tab'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="admin-page-message error">{error}</p> : null}

      <div className="admin-page-card">
        {loading ? <p className="hint">Loading…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="hint">Nothing here yet.</p>
        ) : null}

        {!loading && rows.length > 0 && tab === 'messages' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>From</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.created_at)}</td>
                    <td>
                      <strong>{row.name}</strong>
                      <div>{row.email}</div>
                      <div>{row.phone || '—'}</div>
                    </td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && rows.length > 0 && (tab === 'email' || tab === 'sms') ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Name</th>
                  <th>{tab === 'email' ? 'Email' : 'Phone'}</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.created_at)}</td>
                    <td>{row.name || '—'}</td>
                    <td>{tab === 'email' ? row.email : row.phone}</td>
                    <td>{row.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && rows.length > 0 && tab === 'reviews' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.created_at)}</td>
                    <td>{row.products?.name || `Product ${row.product_id}`}</td>
                    <td>{row.rating}</td>
                    <td>{row.comment || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-gold-button"
                        onClick={() => removeReview(row.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && rows.length > 0 && tab === 'bookings' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.booking_date} {String(row.start_time || '').slice(0, 5)}
                    </td>
                    <td>
                      <strong>{row.customer_name}</strong>
                      <div>{row.phone}</div>
                      <div>{row.email || '—'}</div>
                    </td>
                    <td>{row.services?.name || '—'}</td>
                    <td>
                      <select
                        value={row.status || 'pending'}
                        onChange={(event) => updateBooking(row.id, event.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Inbox;
