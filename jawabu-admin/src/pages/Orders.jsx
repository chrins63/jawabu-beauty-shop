import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  X,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatOrderCustomer } from '../lib/phone';
import './order.css';

const STATUS_OPTIONS = [
  'all',
  'pending',
  'processing',
  'completed',
  'cancelled',
];

function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('order') || '');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [updating, setUpdating] = useState(false);

  // =========================================================
  // LOAD ORDERS
  // =========================================================

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const tracked = searchParams.get('order');
    if (!tracked) {
      return;
    }

    setSearch(tracked);

    if (!orders.length) {
      return;
    }

    const match = orders.find((order) =>
      String(order.order_number || '').toLowerCase() === tracked.toLowerCase()
      || String(order.id) === tracked
    );

    if (match) {
      openOrder(match);
    }
  }, [searchParams, orders]);

  const fetchOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  // =========================================================
  // OPEN ORDER
  // =========================================================

  const openOrder = async (order) => {
    setSelectedOrder(order);
    setOrderItems([]);
    setItemsLoading(true);

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        *,
        products (
          name,
          sku,
          image_url
        )
      `)
      .eq('order_id', order.id);

    if (error) {
      console.error('Error loading order items:', error);
      setOrderItems([]);
    } else {
      setOrderItems(data || []);
    }

    setItemsLoading(false);
  };

  // =========================================================
  // CLOSE ORDER
  // =========================================================

  const closeOrder = () => {
    if (updating) return;

    setSelectedOrder(null);
    setOrderItems([]);
  };

  // =========================================================
  // UPDATE ORDER STATUS
  // =========================================================

  const updateOrderStatus = async (newStatus) => {
    if (!selectedOrder) {
      return;
    }

    const orderId = selectedOrder.id;

    if (!orderId) {
      alert('Unable to update order: Order ID is missing.');
      return;
    }

    if (!newStatus) {
      alert('Unable to update order: Status is missing.');
      return;
    }

    // Don't update if status hasn't changed
    if (
      String(selectedOrder.status || '').toLowerCase() ===
      String(newStatus).toLowerCase()
    ) {
      return;
    }

    setUpdating(true);

    try {
      console.log(
        'Updating order:',
        orderId,
        '→',
        newStatus
      );

      const { data, error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select('*');

      if (error) {
        console.error(
          'Error updating order:',
          error
        );

        throw new Error(
          `Failed to update order: ${error.message}`
        );
      }

      /*
       * Supabase returns an array from .select().
       *
       * We expect exactly one order because id is the
       * primary key.
       */

      if (!data || data.length === 0) {
        throw new Error(
          'The order could not be updated. No matching order was found.'
        );
      }

      const updatedOrder = data[0];

      console.log(
        'Order updated successfully:',
        updatedOrder
      );

      // Update selected order in modal
      setSelectedOrder(updatedOrder);

      // Update order in table
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === updatedOrder.id
            ? updatedOrder
            : order
        )
      );

    } catch (error) {
      console.error(
        'Order status update failed:',
        error
      );

      alert(
        error.message ||
          'Failed to update order.'
      );
    } finally {
      setUpdating(false);
    }
  };

  // =========================================================
  // FILTER ORDERS
  // =========================================================

  const filteredOrders = orders.filter((order) => {
    const searchText =
      search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      String(order.order_number || '')
        .toLowerCase()
        .includes(searchText) ||
      String(order.id)
        .toLowerCase()
        .includes(searchText) ||
      (order.first_name || '')
        .toLowerCase()
        .includes(searchText) ||
      (order.last_name || '')
        .toLowerCase()
        .includes(searchText) ||
      (order.email || '')
        .toLowerCase()
        .includes(searchText) ||
      (order.phone || '')
        .toLowerCase()
        .includes(searchText);

    const matchesStatus =
      statusFilter === 'all' ||
      (order.status || '')
        .toLowerCase() === statusFilter;

    return (
      matchesSearch &&
      matchesStatus
    );
  });

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return '—';
    }

    return new Date(date).toLocaleString(
      'en-KE',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );
  };

  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    const numericAmount = Number(amount ?? 0);
    const formatted = numericAmount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `KSh ${formatted}`;
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    const value = (status || '').toLowerCase();

    if (value === 'completed') {
      return 'status completed';
    }

    if (value === 'processing') {
      return 'status processing';
    }

    if (value === 'cancelled') {
      return 'status cancelled';
    }

    return 'status pending';
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="orders-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="orders-header">

        <div>
          <h1>Orders</h1>

          <p>
            Manage and track Sleek Sisters orders.
          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? 'is-spinning'
                : ''
            }
          />

          Refresh
        </button>

      </div>


      {/* =====================================================
          TOOLBAR
      ====================================================== */}

      <div className="orders-toolbar">

        <input
          type="text"
          placeholder="Search by order number, customer, email or phone..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
        >
          {STATUS_OPTIONS.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status === 'all'
                  ? 'All statuses'
                  : status
                      .charAt(0)
                      .toUpperCase() +
                    status.slice(1)}
              </option>
            )
          )}
        </select>

      </div>


      {/* =====================================================
          ORDERS CARD
      ====================================================== */}

      <div className="orders-card">

        <div className="orders-card-header">

          <div>
            <h2>All Orders</h2>

            <p>
              {filteredOrders.length}{' '}
              order
              {filteredOrders.length === 1
                ? ''
                : 's'}
            </p>
          </div>

        </div>


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (

          <div className="orders-empty">

            <div className="loading-spinner">

              <Loader2
                size={22}
                className="is-spinning"
              />

              Loading...

            </div>

          </div>

        ) : filteredOrders.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================== */

          <div className="orders-empty">

            <div className="empty-icon">
              <ShoppingBag size={38} />
            </div>

            <h3>
              No orders found
            </h3>

            <p>
              {orders.length === 0
                ? 'There are no orders in the system yet.'
                : 'Try changing your search or filter.'}
            </p>

          </div>

        ) : (

          /* =================================================
             TABLE
          ================================================== */

          <div className="orders-table-wrapper">

            <table className="orders-table">

              <thead>

                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>

              </thead>

              <tbody>

                {filteredOrders.map(
                  (order) => (

                    <tr key={order.id}>

                      {/* ORDER */}

                      <td>
                        <strong>
                          {order.order_number || `#${order.id}`}
                        </strong>
                      </td>


                      {/* CUSTOMER */}

                      <td>

                        <div className="customer-name">
                          {formatOrderCustomer(order)}
                        </div>

                        <div className="customer-contact">

                          {order.phone ||
                            order.email ||
                            'No contact'}

                        </div>

                      </td>


                      {/* DATE */}

                      <td>
                        {formatDate(
                          order.created_at ||
                            order.order_date
                        )}
                      </td>


                      {/* TOTAL */}

                      <td>

                        <strong>
                          {formatCurrency(
                            order.total_amount
                          )}
                        </strong>

                      </td>


                      {/* PAYMENT */}

                      <td>

                        <div>
                          {order.payment_method ||
                            '—'}
                        </div>

                        <small
                          className={getStatusClass(
                            order.payment_status
                          )}
                        >
                          {order.payment_status ||
                            'unknown'}
                        </small>

                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={getStatusClass(
                            order.status
                          )}
                        >
                          {order.status ||
                            'pending'}
                        </span>

                      </td>


                      {/* VIEW */}

                      <td>

                        <button
                          type="button"
                          className="view-button"
                          onClick={() =>
                            openOrder(order)
                          }
                        >
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
          ORDER MODAL
      ====================================================== */}

      {selectedOrder && (

        <div
          className="order-modal-overlay"
          onClick={closeOrder}
        >

          <div
            className="order-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* =============================================
                MODAL HEADER
            ============================================== */}

            <div className="order-modal-header">

              <div>

                <h2>
                  {selectedOrder.order_number || `Order #${selectedOrder.id}`}
                </h2>

                <p>
                  {formatDate(
                    selectedOrder.created_at ||
                      selectedOrder.order_date
                  )}
                </p>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeOrder}
                disabled={updating}
              >
                <X size={18} />
              </button>

            </div>


            {/* =============================================
                ORDER DETAILS
            ============================================== */}

            <div className="order-details-grid">

              <div>
                <span>Placed by</span>

                <strong>
                  {formatOrderCustomer(selectedOrder)}
                </strong>
              </div>


              <div>
                <span>Phone</span>

                <strong>
                  {selectedOrder.phone || '—'}
                </strong>
              </div>


              <div>
                <span>Email</span>

                <strong>
                  {selectedOrder.email || '—'}
                </strong>
              </div>


              <div>
                <span>City</span>

                <strong>
                  {selectedOrder.city || '—'}
                </strong>
              </div>


              <div>
                <span>Payment Method</span>

                <strong>
                  {selectedOrder.payment_method ||
                    '—'}
                </strong>
              </div>


              <div>
                <span>Payment Status</span>

                <strong>
                  {selectedOrder.payment_status ||
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
                <span>Delivery Fee</span>

                <strong>
                  {formatCurrency(
                    selectedOrder.delivery_fee
                  )}
                </strong>
              </div>

            </div>


            {/* =============================================
                DELIVERY
            ============================================== */}

            <div className="order-section">

              <h3>
                Delivery Address
              </h3>

              <p>
                {selectedOrder.delivery_address ||
                  'No delivery address'}
              </p>
              {selectedOrder.city && (
                <p>{selectedOrder.city}</p>
              )}
              {selectedOrder.delivery_lat != null &&
                selectedOrder.delivery_lng != null && (
                  <p>
                    <a
                      href={`https://www.google.com/maps?q=${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open pin in Google Maps
                    </a>
                  </p>
                )}

            </div>


            {/* =============================================
                PRODUCTS
            ============================================== */}

            <div className="order-section">

              <h3>
                Products
              </h3>

              {itemsLoading ? (

                <p>
                  Loading products...
                </p>

              ) : orderItems.length === 0 ? (

                <p>
                  No products found for this order.
                </p>

              ) : (

                <div className="order-items">

                  {orderItems.map(
                    (item) => (

                      <div
                        className="order-item"
                        key={item.id}
                      >

                        <div>

                          <strong>
                            {item.products?.name ||
                              'Unknown product'}
                          </strong>

                          <small>
                            SKU:{' '}
                            {item.products?.sku ||
                              '—'}
                          </small>

                        </div>

                        <div>
                          × {item.quantity}
                        </div>

                        <strong>
                          {formatCurrency(
                            Number(
                              item.price_at_purchase ||
                                0
                            ) *
                              Number(
                                item.quantity || 0
                              )
                          )}
                        </strong>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>


            {/* =============================================
                TOTAL
            ============================================== */}

            <div className="order-total">

              <span>
                Total
              </span>

              <strong>
                {formatCurrency(
                  selectedOrder.total_amount
                )}
              </strong>

            </div>


            {/* =============================================
                STATUS UPDATE
            ============================================== */}

            <div className="order-section">

              <h3>
                Update Order Status
              </h3>

              <div className="status-buttons">

                {STATUS_OPTIONS
                  .filter(
                    (status) =>
                      status !== 'all'
                  )
                  .map(
                    (status) => (

                      <button
                        type="button"
                        key={status}
                        className={
                          selectedOrder.status
                            ?.toLowerCase() ===
                          status
                            ? 'active-status'
                            : ''
                        }
                        disabled={
                          updating
                        }
                        onClick={() =>
                          updateOrderStatus(
                            status
                          )
                        }
                      >

                        {updating &&
                        selectedOrder.status
                          ?.toLowerCase() !==
                          status ? (
                          status
                            .charAt(0)
                            .toUpperCase() +
                          status.slice(1)
                        ) : (
                          status
                            .charAt(0)
                            .toUpperCase() +
                          status.slice(1)
                        )}

                      </button>

                    )
                  )}

              </div>

              {updating && (
                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Loader2
                    size={16}
                    className="is-spinning"
                  />

                  Updating order...

                </div>
              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Orders;
 
