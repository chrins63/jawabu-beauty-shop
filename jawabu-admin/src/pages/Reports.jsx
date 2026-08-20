import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './reports.css';

function Reports() {
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // =========================================================
  // FETCH REPORT DATA
  // =========================================================

  const fetchReport = async () => {
    setLoading(true);
    setError('');

    try {
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates.');
      }

      if (startDate > endDate) {
        throw new Error(
          'Start date cannot be later than the end date.'
        );
      }

      // Include the entire end date.
      const startDateTime = `${startDate}T00:00:00`;
      const endDateTime = `${endDate}T23:59:59.999`;

      // =====================================================
      // 1. ORDERS
      // =====================================================

      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          delivery_fee,
          payment_method,
          sales_channel,
          created_at
        `)
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime)
        .order('created_at', {
          ascending: false,
        });

      if (orderError) {
        throw new Error(
          `Unable to load orders: ${orderError.message}`
        );
      }

      // =====================================================
      // 2. ORDER ITEMS
      // =====================================================

      const orderIds = (orderData || []).map(
        (order) => order.id
      );

      let itemData = [];

      if (orderIds.length > 0) {
        const {
          data,
          error: itemError,
        } = await supabase
          .from('order_items')
          .select(`
            id,
            order_id,
            product_id,
            quantity,
            price_at_purchase
          `)
          .in('order_id', orderIds);

        if (itemError) {
          throw new Error(
            `Unable to load order items: ${itemError.message}`
          );
        }

        itemData = data || [];
      }

      // =====================================================
      // 3. PRODUCTS
      // =====================================================

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          cost_price
        `);

      if (productError) {
        throw new Error(
          `Unable to load products: ${productError.message}`
        );
      }

      setOrders(orderData || []);
      setOrderItems(itemData);
      setProducts(productData || []);
    } catch (err) {
      console.error('Reports error:', err);
      setError(
        err.message || 'Unable to load report.'
      );

      setOrders([]);
      setOrderItems([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL REPORT
  // =========================================================

  useEffect(() => {
    fetchReport();
  }, []);

  // =========================================================
  // SUCCESSFUL ORDERS
  // =========================================================

  const successfulOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status === 'delivered' ||
        order.status === 'completed'
    );
  }, [orders]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary = useMemo(() => {
    const totalSales = successfulOrders.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const pendingOrders = orders.filter(
      (order) => order.status === 'pending'
    );

    const cancelledOrders = orders.filter(
      (order) => order.status === 'cancelled'
    );

    const pendingAmount = pendingOrders.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const cancelledAmount = cancelledOrders.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const averageOrderValue =
      successfulOrders.length > 0
        ? totalSales / successfulOrders.length
        : 0;

    return {
      totalSales,
      successfulOrders: successfulOrders.length,
      pendingOrders: pendingOrders.length,
      pendingAmount,
      cancelledOrders: cancelledOrders.length,
      cancelledAmount,
      averageOrderValue,
    };
  }, [orders, successfulOrders]);

  // =========================================================
  // PAYMENT METHOD BREAKDOWN
  // =========================================================

  const paymentBreakdown = useMemo(() => {
    const result = {};

    successfulOrders.forEach((order) => {
      const method =
        order.payment_method || 'unknown';

      if (!result[method]) {
        result[method] = {
          orderCount: 0,
          totalAmount: 0,
        };
      }

      result[method].orderCount += 1;

      result[method].totalAmount += Number(
        order.total_amount || 0
      );
    });

    return Object.entries(result)
      .map(([method, data]) => ({
        method,
        ...data,
      }))
      .sort(
        (a, b) =>
          b.totalAmount - a.totalAmount
      );
  }, [successfulOrders]);

  // =========================================================
  // SALES CHANNEL BREAKDOWN
  // =========================================================

  const channelBreakdown = useMemo(() => {
    const result = {};

    successfulOrders.forEach((order) => {
      const channel =
        order.sales_channel || 'unknown';

      if (!result[channel]) {
        result[channel] = {
          orderCount: 0,
          totalAmount: 0,
        };
      }

      result[channel].orderCount += 1;

      result[channel].totalAmount += Number(
        order.total_amount || 0
      );
    });

    return Object.entries(result)
      .map(([channel, data]) => ({
        channel,
        ...data,
      }))
      .sort(
        (a, b) =>
          b.totalAmount - a.totalAmount
      );
  }, [successfulOrders]);

  // =========================================================
  // TOP PRODUCTS
  // =========================================================

  const topProducts = useMemo(() => {
    const result = {};

    const successfulOrderIds = new Set(
      successfulOrders.map(
        (order) => order.id
      )
    );

    orderItems.forEach((item) => {
      if (
        !successfulOrderIds.has(
          item.order_id
        )
      ) {
        return;
      }

      const productId = item.product_id;

      if (!result[productId]) {
        result[productId] = {
          productId,
          quantitySold: 0,
          revenue: 0,
          orderCount: new Set(),
        };
      }

      result[productId].quantitySold +=
        Number(item.quantity || 0);

      result[productId].revenue +=
        Number(item.price_at_purchase || 0) *
        Number(item.quantity || 0);

      result[productId].orderCount.add(
        item.order_id
      );
    });

    return Object.values(result)
      .map((item) => {
        const product = products.find(
          (p) => p.id === item.productId
        );

        return {
          productId: item.productId,
          productName:
            product?.name ||
            `Product #${item.productId}`,
          quantitySold:
            item.quantitySold,
          orderCount:
            item.orderCount.size,
          revenue:
            item.revenue,
        };
      })
      .sort(
        (a, b) =>
          b.revenue - a.revenue
      );
  }, [
    orderItems,
    products,
    successfulOrders,
  ]);

  // =========================================================
  // CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    return `KSh ${Number(
      amount || 0
    ).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================================
  // QUICK DATE FILTERS
  // =========================================================

  const setToday = () => {
    setStartDate(today);
    setEndDate(today);
  };

  const setLast7Days = () => {
    const end = new Date();

    const start = new Date();
    start.setDate(
      start.getDate() - 6
    );

    setStartDate(
      start.toISOString().split('T')[0]
    );

    setEndDate(
      end.toISOString().split('T')[0]
    );
  };

  const setLast30Days = () => {
    const end = new Date();

    const start = new Date();
    start.setDate(
      start.getDate() - 29
    );

    setStartDate(
      start.toISOString().split('T')[0]
    );

    setEndDate(
      end.toISOString().split('T')[0]
    );
  };

  const setThisMonth = () => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    setStartDate(
      start.toISOString().split('T')[0]
    );

    setEndDate(
      today
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="reports-page">

      <div className="reports-header">
        <div>
          <h1>Reports</h1>

          <p>
            Analyze Jawabu Beauty sales,
            products and business performance.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReport}
          disabled={loading}
        >
          {loading
            ? 'Loading...'
            : '↻ Run Report'}
        </button>
      </div>

      {/* DATE FILTER */}

      <section className="reports-filter">

        <div>
          <label>
            Start Date
          </label>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(
                event.target.value
              )
            }
          />
        </div>

        <div>
          <label>
            End Date
          </label>

          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(
                event.target.value
              )
            }
          />
        </div>

        <div className="reports-quick-filters">

          <button
            type="button"
            onClick={setToday}
          >
            Today
          </button>

          <button
            type="button"
            onClick={setLast7Days}
          >
            Last 7 Days
          </button>

          <button
            type="button"
            onClick={setLast30Days}
          >
            Last 30 Days
          </button>

          <button
            type="button"
            onClick={setThisMonth}
          >
            This Month
          </button>

        </div>

      </section>

      {error && (
        <div className="reports-error">
          <strong>
            Report Error
          </strong>

          <p>
            {error}
          </p>
        </div>
      )}

      {/* SUMMARY */}

      <section className="reports-summary">

        <div className="report-card">
          <span>Total Sales</span>
          <strong>
            {formatCurrency(
              summary.totalSales
            )}
          </strong>
        </div>

        <div className="report-card">
          <span>Successful Orders</span>
          <strong>
            {summary.successfulOrders}
          </strong>
        </div>

        <div className="report-card">
          <span>Average Order</span>
          <strong>
            {formatCurrency(
              summary.averageOrderValue
            )}
          </strong>
        </div>

        <div className="report-card">
          <span>Pending Orders</span>
          <strong>
            {summary.pendingOrders}
          </strong>

          <small>
            {formatCurrency(
              summary.pendingAmount
            )}
          </small>
        </div>

        <div className="report-card">
          <span>Cancelled Orders</span>
          <strong>
            {summary.cancelledOrders}
          </strong>

          <small>
            {formatCurrency(
              summary.cancelledAmount
            )}
          </small>
        </div>

      </section>

      {/* PAYMENT */}

      <section className="reports-section">

        <div className="reports-section-header">
          <div>
            <h2>
              Payment Methods
            </h2>

            <p>
              Successful sales by payment method.
            </p>
          </div>
        </div>

        {paymentBreakdown.length === 0 ? (

          <p>
            No payment data for this period.
          </p>

        ) : (

          <div className="reports-table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Orders</th>
                  <th>Sales</th>
                </tr>
              </thead>

              <tbody>

                {paymentBreakdown.map(
                  (item) => (
                    <tr key={item.method}>

                      <td>
                        {item.method}
                      </td>

                      <td>
                        {item.orderCount}
                      </td>

                      <td>
                        {formatCurrency(
                          item.totalAmount
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* CHANNEL */}

      <section className="reports-section">

        <div className="reports-section-header">
          <div>
            <h2>
              Sales Channels
            </h2>

            <p>
              Performance by sales channel.
            </p>
          </div>
        </div>

        {channelBreakdown.length === 0 ? (

          <p>
            No channel data for this period.
          </p>

        ) : (

          <div className="reports-table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Orders</th>
                  <th>Sales</th>
                </tr>
              </thead>

              <tbody>

                {channelBreakdown.map(
                  (item) => (
                    <tr key={item.channel}>

                      <td>
                        {item.channel}
                      </td>

                      <td>
                        {item.orderCount}
                      </td>

                      <td>
                        {formatCurrency(
                          item.totalAmount
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* TOP PRODUCTS */}

      <section className="reports-section">

        <div className="reports-section-header">
          <div>
            <h2>
              Top Products
            </h2>

            <p>
              Best-performing products during
              the selected period.
            </p>
          </div>
        </div>

        {topProducts.length === 0 ? (

          <p>
            No product sales for this period.
          </p>

        ) : (

          <div className="reports-table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>

              <tbody>

                {topProducts.map(
                  (item) => (
                    <tr key={item.productId}>

                      <td>
                        {item.productName}
                      </td>

                      <td>
                        {item.quantitySold}
                      </td>

                      <td>
                        {item.orderCount}
                      </td>

                      <td>
                        {formatCurrency(
                          item.revenue
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default Reports;