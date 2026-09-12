import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Search,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Eye,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './payments.css';

const PAYMENT_METHODS = [
  'all',
  'cash',
  'mpesa',
  'card',
  'bank',
];

const PAYMENT_STATUSES = [
  'all',
  'completed',
  'pending',
  'failed',
  'refunded',
];

function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // =========================================================
  // LOAD PAYMENTS
  // =========================================================

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    } else {
      setPayments(data || []);
    }

    setLoading(false);
  };

  // =========================================================
  // CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    return (
      'KSh ' +
      Number(amount || 0).toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // =========================================================
  // DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // =========================================================
  // PAYMENT METHOD ICON
  // =========================================================

  const getPaymentIcon = (method) => {
    const value = (method || '').toLowerCase();

    if (value === 'cash') {
      return <Banknote size={17} />;
    }

    if (value === 'mpesa') {
      return <Smartphone size={17} />;
    }

    if (value === 'bank') {
      return <Building2 size={17} />;
    }

    return <CreditCard size={17} />;
  };

  // =========================================================
  // PAYMENT METHOD LABEL
  // =========================================================

  const formatPaymentMethod = (method) => {
    if (!method) return 'Unknown';

    if (method.toLowerCase() === 'mpesa') {
      return 'M-Pesa';
    }

    if (method.toLowerCase() === 'bank') {
      return 'Bank Transfer';
    }

    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    const value = (status || '').toLowerCase();

    if (value === 'completed') {
      return 'payment-status completed';
    }

    if (value === 'pending') {
      return 'payment-status pending';
    }

    if (value === 'failed') {
      return 'payment-status failed';
    }

    if (value === 'refunded') {
      return 'payment-status refunded';
    }

    return 'payment-status';
  };

  // =========================================================
  // FILTER PAYMENTS
  // =========================================================

  const filteredPayments = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return payments.filter((payment) => {
      const matchesSearch =
        !searchText ||
        String(payment.id || '')
          .toLowerCase()
          .includes(searchText) ||
        String(payment.order_id || '')
          .toLowerCase()
          .includes(searchText) ||
        String(payment.transaction_id || '')
          .toLowerCase()
          .includes(searchText) ||
        String(payment.payment_method || '')
          .toLowerCase()
          .includes(searchText);

      const matchesMethod =
        methodFilter === 'all' ||
        (payment.payment_method || '').toLowerCase() ===
          methodFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (payment.status || '').toLowerCase() ===
          statusFilter;

      return (
        matchesSearch &&
        matchesMethod &&
        matchesStatus
      );
    });
  }, [
    payments,
    search,
    methodFilter,
    statusFilter,
  ]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalPayments = filteredPayments.length;

  const totalAmount = filteredPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  const completedAmount = filteredPayments
    .filter(
      (payment) =>
        (payment.status || '').toLowerCase() ===
        'completed'
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const pendingAmount = filteredPayments
    .filter(
      (payment) =>
        (payment.status || '').toLowerCase() ===
        'pending'
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  // =========================================================
  // VIEW PAYMENT
  // =========================================================

  const openPayment = async (payment) => {
    setSelectedPayment(payment);
    setSelectedOrder(null);

    if (!payment.order_id) {
      return;
    }

    setLoadingOrder(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', payment.order_id)
      .maybeSingle();

    if (error) {
      console.error(
        'Error loading payment order:',
        error
      );
    }

    setSelectedOrder(data || null);
    setLoadingOrder(false);
  };

  // =========================================================
  // CLOSE PAYMENT
  // =========================================================

  const closePayment = () => {
    setSelectedPayment(null);
    setSelectedOrder(null);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="payments-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="payments-header">

        <div>
          <h1>Payments</h1>

          <p>
            Monitor and manage Sleek Sisters
            payment transactions.
          </p>
        </div>

        <button
          type="button"
          className="payments-refresh-button"
          onClick={fetchPayments}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading ? 'is-spinning' : ''
            }
          />

          Refresh
        </button>

      </div>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="payments-summary">

        <div className="payment-summary-card">

          <div className="payment-summary-icon">
            <CreditCard size={21} />
          </div>

          <div>
            <span>Total Payments</span>

            <strong>
              {totalPayments}
            </strong>
          </div>

        </div>

        <div className="payment-summary-card">

          <div className="payment-summary-icon">
            <Banknote size={21} />
          </div>

          <div>
            <span>Total Amount</span>

            <strong>
              {formatCurrency(totalAmount)}
            </strong>
          </div>

        </div>

        <div className="payment-summary-card">

          <div className="payment-summary-icon">
            <CreditCard size={21} />
          </div>

          <div>
            <span>Completed</span>

            <strong>
              {formatCurrency(completedAmount)}
            </strong>
          </div>

        </div>

        <div className="payment-summary-card">

          <div className="payment-summary-icon">
            <Loader2 size={21} />
          </div>

          <div>
            <span>Pending</span>

            <strong>
              {formatCurrency(pendingAmount)}
            </strong>
          </div>

        </div>

      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="payments-toolbar">

        <div className="payments-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search payment, order, transaction..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <select
          value={methodFilter}
          onChange={(event) =>
            setMethodFilter(event.target.value)
          }
        >
          {PAYMENT_METHODS.map((method) => (
            <option
              key={method}
              value={method}
            >
              {method === 'all'
                ? 'All payment methods'
                : formatPaymentMethod(method)}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          {PAYMENT_STATUSES.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status === 'all'
                ? 'All statuses'
                : status.charAt(0).toUpperCase() +
                  status.slice(1)}
            </option>
          ))}
        </select>

      </div>

      {/* =====================================================
          PAYMENT TABLE
      ===================================================== */}

      <div className="payments-card">

        <div className="payments-card-header">

          <div>
            <h2>Payment Transactions</h2>

            <p>
              {filteredPayments.length} payment
              {filteredPayments.length === 1
                ? ''
                : 's'}
            </p>
          </div>

        </div>

        {loading ? (

          <div className="payments-empty">

            <Loader2
              size={26}
              className="is-spinning"
            />

            <p>
              Loading payments...
            </p>

          </div>

        ) : filteredPayments.length === 0 ? (

          <div className="payments-empty">

            <div className="payments-empty-icon">
              <CreditCard size={38} />
            </div>

            <h3>
              No payments found
            </h3>

            <p>
              {payments.length === 0
                ? 'No payment transactions have been recorded yet.'
                : 'Try changing your search or filters.'}
            </p>

          </div>

        ) : (

          <div className="payments-table-wrapper">

            <table className="payments-table">

              <thead>

                <tr>
                  <th>Payment</th>
                  <th>Order</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>

              </thead>

              <tbody>

                {filteredPayments.map(
                  (payment) => (

                    <tr key={payment.id}>

                      <td>
                        <strong>
                          #{payment.id}
                        </strong>
                      </td>

                      <td>
                        {payment.order_id ? (
                          <strong>
                            #{payment.order_id}
                          </strong>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            payment.amount
                          )}
                        </strong>
                      </td>

                      <td>

                        <div className="payment-method">

                          <span className="payment-method-icon">
                            {getPaymentIcon(
                              payment.payment_method
                            )}
                          </span>

                          <span>
                            {formatPaymentMethod(
                              payment.payment_method
                            )}
                          </span>

                        </div>

                      </td>

                      <td>

                        <span className="transaction-id">
                          {payment.transaction_id ||
                            '—'}
                        </span>

                      </td>

                      <td>

                        <span
                          className={getStatusClass(
                            payment.status
                          )}
                        >
                          {payment.status ||
                            'Unknown'}
                        </span>

                      </td>

                      <td>
                        {formatDate(
                          payment.created_at
                        )}
                      </td>

                      <td>

                        <button
                          type="button"
                          className="payment-view-button"
                          onClick={() =>
                            openPayment(payment)
                          }
                        >
                          <Eye size={15} />
                          View
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =====================================================
          PAYMENT DETAILS MODAL
      ===================================================== */}

      {selectedPayment && (

        <div
          className="payment-modal-overlay"
          onClick={closePayment}
        >

          <div
            className="payment-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="payment-modal-header">

              <div>

                <h2>
                  Payment #{selectedPayment.id}
                </h2>

                <p>
                  {formatDate(
                    selectedPayment.created_at
                  )}
                </p>

              </div>

              <button
                type="button"
                className="payment-close-button"
                onClick={closePayment}
              >
                <X size={18} />
              </button>

            </div>

            {/* PAYMENT DETAILS */}

            <div className="payment-details-grid">

              <div>
                <span>Amount</span>

                <strong>
                  {formatCurrency(
                    selectedPayment.amount
                  )}
                </strong>
              </div>

              <div>
                <span>Payment Method</span>

                <strong>
                  {formatPaymentMethod(
                    selectedPayment.payment_method
                  )}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  <span
                    className={getStatusClass(
                      selectedPayment.status
                    )}
                  >
                    {selectedPayment.status ||
                      'Unknown'}
                  </span>
                </strong>
              </div>

              <div>
                <span>Order ID</span>

                <strong>
                  {selectedPayment.order_id
                    ? '#' + selectedPayment.order_id
                    : '—'}
                </strong>
              </div>

              <div>
                <span>Transaction ID</span>

                <strong>
                  {selectedPayment.transaction_id ||
                    '—'}
                </strong>
              </div>

              <div>
                <span>Payment Date</span>

                <strong>
                  {formatDate(
                    selectedPayment.created_at
                  )}
                </strong>
              </div>

            </div>

            {/* ORDER */}

            <div className="payment-order-section">

              <h3>
                Related Order
              </h3>

              {loadingOrder ? (

                <div className="payment-order-loading">

                  <Loader2
                    size={20}
                    className="is-spinning"
                  />

                  Loading order...

                </div>

              ) : !selectedOrder ? (

                <p>
                  No related order information
                  found.
                </p>

              ) : (

                <div className="payment-order-card">

                  <div>
                    <span>Customer</span>

                    <strong>
                      {selectedOrder.first_name ||
                        ''}{' '}
                      {selectedOrder.last_name ||
                        ''}
                    </strong>
                  </div>

                  <div>
                    <span>Phone</span>

                    <strong>
                      {selectedOrder.phone ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>Sales Channel</span>

                    <strong>
                      {selectedOrder.sales_channel ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>Order Status</span>

                    <strong>
                      {selectedOrder.status ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>Order Total</span>

                    <strong>
                      {formatCurrency(
                        selectedOrder.total_amount
                      )}
                    </strong>
                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Payments;
