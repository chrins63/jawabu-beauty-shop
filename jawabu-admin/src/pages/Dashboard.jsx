import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { profile, logout } = useAuth();

  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalProducts: 0,
    lowStock: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // --------------------------------------------------
      // TODAY'S DATE RANGE
      // --------------------------------------------------

      const now = new Date();

      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );

      const startOfTomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );

      // --------------------------------------------------
      // 1. TODAY'S COMPLETED SALES
      // --------------------------------------------------

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', startOfTomorrow.toISOString());

      if (paymentsError) {
        throw paymentsError;
      }

      const todaySales = (payments || []).reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
      );

      // --------------------------------------------------
      // 2. TODAY'S ORDERS
      // --------------------------------------------------

      const { count: todayOrders, error: ordersCountError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', startOfTomorrow.toISOString());

      if (ordersCountError) {
        throw ordersCountError;
      }

      // --------------------------------------------------
      // 3. TOTAL PRODUCTS
      // --------------------------------------------------

      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) {
        throw productsError;
      }

      // --------------------------------------------------
      // 4. LOW STOCK PRODUCTS
      // --------------------------------------------------

      const { data: products, error: lowStockError } = await supabase
        .from('products')
        .select('id, stock_quantity, low_stock_threshold');

      if (lowStockError) {
        throw lowStockError;
      }

      const lowStock = (products || []).filter((product) => {
        const stock = Number(product.stock_quantity || 0);
        const threshold = Number(product.low_stock_threshold || 0);

        return stock <= threshold;
      }).length;

      // --------------------------------------------------
      // 5. RECENT ORDERS
      // --------------------------------------------------

      const { data: orders, error: recentOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          total_amount,
          status,
          payment_status,
          payment_method,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(8);

      if (recentOrdersError) {
        throw recentOrdersError;
      }

      setStats({
        todaySales,
        todayOrders: todayOrders || 0,
        totalProducts: totalProducts || 0,
        lowStock,
      });

      setRecentOrders(orders || []);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(
        err.message || 'Unable to load dashboard data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusClass = (status) => {
    if (!status) return 'status-default';

    const value = status.toLowerCase();

    if (
      value === 'completed' ||
      value === 'paid' ||
      value === 'delivered'
    ) {
      return 'status-success';
    }

    if (
      value === 'pending' ||
      value === 'processing'
    ) {
      return 'status-warning';
    }

    if (
      value === 'failed' ||
      value === 'cancelled'
    ) {
      return 'status-danger';
    }

    return 'status-default';
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading Jawabu Beauty dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <header style={styles.header}>

        <div>
          <h1 style={styles.brand}>
            Jawabu Beauty Admin
          </h1>
        </div>

        <div style={styles.headerRight}>

          <div style={styles.userInfo}>
            <strong>
              {profile?.first_name || 'Owner'}{' '}
              {profile?.last_name || ''}
            </strong>

            <span>
              {profile?.role || 'OWNER'}
            </span>
          </div>

          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            Logout
          </button>

        </div>

      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main style={styles.main}>

        <div style={styles.titleRow}>

          <div>
            <h2 style={styles.title}>
              Welcome back!
            </h2>

            <p style={styles.subtitle}>
              Here's what's happening at Jawabu Beauty today.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div style={styles.errorBox}>
            <strong>Dashboard Error</strong>
            <p>{error}</p>
          </div>
        )}

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <div style={styles.statsGrid}>

          {/* SALES */}

          <div style={styles.card}>

            <div style={styles.cardTop}>
              <span style={styles.cardIcon}>
                💰
              </span>

              <span style={styles.cardLabel}>
                Today's Sales
              </span>
            </div>

            <h3 style={styles.cardValue}>
              {formatCurrency(stats.todaySales)}
            </h3>

            <p style={styles.cardDescription}>
              Completed payments today
            </p>

          </div>

          {/* ORDERS */}

          <div style={styles.card}>

            <div style={styles.cardTop}>
              <span style={styles.cardIcon}>
                🛒
              </span>

              <span style={styles.cardLabel}>
                Today's Orders
              </span>
            </div>

            <h3 style={styles.cardValue}>
              {stats.todayOrders}
            </h3>

            <p style={styles.cardDescription}>
              Orders received today
            </p>

          </div>

          {/* PRODUCTS */}

          <div style={styles.card}>

            <div style={styles.cardTop}>
              <span style={styles.cardIcon}>
                📦
              </span>

              <span style={styles.cardLabel}>
                Total Products
              </span>
            </div>

            <h3 style={styles.cardValue}>
              {stats.totalProducts}
            </h3>

            <p style={styles.cardDescription}>
              Products in your catalogue
            </p>

          </div>

          {/* LOW STOCK */}

          <div
            style={{
              ...styles.card,
              ...(stats.lowStock > 0
                ? styles.lowStockCard
                : {}),
            }}
          >

            <div style={styles.cardTop}>
              <span style={styles.cardIcon}>
                ⚠️
              </span>

              <span style={styles.cardLabel}>
                Low Stock
              </span>
            </div>

            <h3 style={styles.cardValue}>
              {stats.lowStock}
            </h3>

            <p style={styles.cardDescription}>
              Products needing attention
            </p>

          </div>

        </div>

        {/* =================================================
            RECENT ORDERS
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>
              <h2 style={styles.sectionTitle}>
                Recent Orders
              </h2>

              <p style={styles.sectionDescription}>
                The latest orders placed in Jawabu Beauty.
              </p>
            </div>

          </div>

          {recentOrders.length === 0 ? (

            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                🛒
              </div>

              <h3>
                No orders yet
              </h3>

              <p>
                New customer orders will appear here.
              </p>
            </div>

          ) : (

            <div style={styles.ordersTableWrapper}>

              <table style={styles.table}>

                <thead>

                  <tr>

                    <th style={styles.th}>
                      Order
                    </th>

                    <th style={styles.th}>
                      Customer
                    </th>

                    <th style={styles.th}>
                      Amount
                    </th>

                    <th style={styles.th}>
                      Payment
                    </th>

                    <th style={styles.th}>
                      Order Status
                    </th>

                    <th style={styles.th}>
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {recentOrders.map((order) => (

                    <tr key={order.id}>

                      <td style={styles.td}>
                        <strong>
                          #{order.id}
                        </strong>
                      </td>

                      <td style={styles.td}>

                        <div>
                          <strong>
                            {order.first_name || 'Customer'}{' '}
                            {order.last_name || ''}
                          </strong>
                        </div>

                        <small style={styles.customerEmail}>
                          {order.email || order.phone || '—'}
                        </small>

                      </td>

                      <td style={styles.td}>

                        <strong>
                          {formatCurrency(
                            order.total_amount
                          )}
                        </strong>

                      </td>

                      <td style={styles.td}>

                        <span
                          className={getStatusClass(
                            order.payment_status
                          )}
                          style={styles.status}
                        >
                          {order.payment_status || 'Unknown'}
                        </span>

                      </td>

                      <td style={styles.td}>

                        <span
                          className={getStatusClass(
                            order.status
                          )}
                          style={styles.status}
                        >
                          {order.status || 'Unknown'}
                        </span>

                      </td>

                      <td style={styles.td}>
                        {formatDate(order.created_at)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

const styles = {

  page: {
    minHeight: '100vh',
    background: '#f7f7f8',
    color: '#111827',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  header: {
    height: '86px',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 34px',
    boxSizing: 'border-box',
  },

  brand: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '22px',
  },

  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },

  userInfoSpan: {
    fontSize: '13px',
  },

  logoutButton: {
    border: 'none',
    background: '#f1f3f5',
    padding: '12px 20px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
  },

  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '38px 34px 60px',
  },

  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '30px',
    gap: '20px',
  },

  title: {
    margin: 0,
    fontSize: '36px',
    fontWeight: 700,
  },

  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280',
    fontSize: '17px',
  },

  refreshButton: {
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    padding: '11px 18px',
    borderRadius: '9px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '35px',
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e9eaec',
    borderRadius: '16px',
    padding: '25px',
    boxShadow:
      '0 5px 18px rgba(0, 0, 0, 0.04)',
  },

  lowStockCard: {
    border:
      '1px solid rgba(234, 88, 12, 0.35)',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '17px',
  },

  cardIcon: {
    fontSize: '22px',
  },

  cardLabel: {
    color: '#6b7280',
    fontSize: '15px',
    fontWeight: 600,
  },

  cardValue: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 700,
  },

  cardDescription: {
    margin: '9px 0 0',
    color: '#9ca3af',
    fontSize: '13px',
  },

  section: {
    background: '#ffffff',
    border:
      '1px solid #e9eaec',
    borderRadius: '16px',
    boxShadow:
      '0 5px 18px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },

  sectionHeader: {
    padding: '25px 26px',
    borderBottom:
      '1px solid #eeeeee',
  },

  sectionTitle: {
    margin: 0,
    fontSize: '21px',
  },

  sectionDescription: {
    margin: '6px 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },

  ordersTableWrapper: {
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '850px',
  },

  th: {
    textAlign: 'left',
    padding: '15px 20px',
    background: '#fafafa',
    color: '#6b7280',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom:
      '1px solid #eeeeee',
  },

  td: {
    padding: '17px 20px',
    borderBottom:
      '1px solid #f0f0f0',
    fontSize: '14px',
    verticalAlign: 'middle',
  },

  customerEmail: {
    color: '#9ca3af',
    fontSize: '12px',
  },

  status: {
    display: 'inline-block',
    padding: '5px 9px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },

  emptyState: {
    padding: '70px 20px',
    textAlign: 'center',
    color: '#6b7280',
  },

  emptyIcon: {
    fontSize: '38px',
    marginBottom: '10px',
  },

  errorBox: {
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    color: '#be123c',
    padding: '16px 20px',
    borderRadius: '10px',
    marginBottom: '25px',
  },

  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
  },

  spinner: {
    width: '32px',
    height: '32px',
    border:
      '3px solid #e5e7eb',
    borderTop:
      '3px solid #ec1760',
    borderRadius: '50%',
    marginBottom: '15px',
  },
};

export default Dashboard;