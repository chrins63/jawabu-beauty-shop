import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  AreaSeries,
  Area,
  Gradient,
  GradientStop,
  GridlineSeries,
  Gridline,
} from 'reaviz';

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import './reports.css';

/* =========================================================
   CONSTANTS
   ========================================================= */

const SUCCESSFUL_STATUSES = ['completed', 'delivered'];

const getDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getToday = () => getDateString(new Date());

const formatCurrency = (amount) => {
  return `KSh ${Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCompactCurrency = (amount) => {
  const value = Number(amount || 0);

  if (value >= 1_000_000) {
    return `KSh ${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `KSh ${(value / 1_000).toFixed(1)}K`;
  }

  return formatCurrency(value);
};

const formatDate = (value) => {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeLabel = (value) => {
  if (!value) return 'Unknown';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/* =========================================================
   ICONS
   ========================================================= */

function MetricIcon({ type }) {
  const common = {
    size: 20,
    strokeWidth: 2,
  };

  switch (type) {
    case 'sales':
      return <CircleDollarSign {...common} />;

    case 'orders':
      return <ShoppingBag {...common} />;

    case 'average':
      return <TrendingUp {...common} />;

    case 'pending':
      return <AlertCircle {...common} />;

    case 'cancelled':
      return <XCircle {...common} />;

    default:
      return <BarChart3 {...common} />;
  }
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

function Reports() {
  const today = getToday();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* =======================================================
     FETCH REPORT DATA
     ======================================================= */

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!startDate || !endDate) {
        throw new Error(
          'Please select both a start date and an end date.'
        );
      }

      if (startDate > endDate) {
        throw new Error(
          'Start date cannot be later than the end date.'
        );
      }

      /*
       * We use the selected dates as boundaries.
       *
       * The database stores timestamps with timezone,
       * so the final date is treated as the complete day.
       */

      const startDateTime = `${startDate}T00:00:00`;
      const endDateTime = `${endDate}T23:59:59.999`;

      /* ===================================================
         ORDERS
         =================================================== */

      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          delivery_fee,
          payment_method,
          sales_channel,
          created_at,
          order_date
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

      const loadedOrders = orderData || [];

      /* ===================================================
         ORDER ITEMS
         =================================================== */

      const orderIds = loadedOrders.map((order) => order.id);

      let loadedOrderItems = [];

      if (orderIds.length > 0) {
        const {
          data: itemData,
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

        loadedOrderItems = itemData || [];
      }

      /* ===================================================
         PRODUCTS
         =================================================== */

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          cost_price,
          stock_quantity,
          image_url,
          active
        `);

      if (productError) {
        throw new Error(
          `Unable to load products: ${productError.message}`
        );
      }

      setOrders(loadedOrders);
      setOrderItems(loadedOrderItems);
      setProducts(productData || []);
    } catch (err) {
      console.error('Reports error:', err);

      setError(
        err?.message || 'Unable to load report.'
      );

      setOrders([]);
      setOrderItems([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  /* =======================================================
     INITIAL REPORT
     ======================================================= */

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* =======================================================
     SUCCESSFUL ORDERS
     ======================================================= */

  const successfulOrders = useMemo(() => {
    return orders.filter((order) =>
      SUCCESSFUL_STATUSES.includes(
        String(order.status || '').toLowerCase()
      )
    );
  }, [orders]);

  /* =======================================================
     SUMMARY
     ======================================================= */

  const summary = useMemo(() => {
    const totalSales = successfulOrders.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const pendingOrders = orders.filter(
      (order) =>
        String(order.status || '').toLowerCase() ===
        'pending'
    );

    const cancelledOrders = orders.filter(
      (order) =>
        String(order.status || '').toLowerCase() ===
        'cancelled'
    );

    const processingOrders = orders.filter(
      (order) =>
        String(order.status || '').toLowerCase() ===
        'processing'
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
      processingOrders: processingOrders.length,
      averageOrderValue,
      totalOrders: orders.length,
    };
  }, [orders, successfulOrders]);

  /* =======================================================
     PAYMENT BREAKDOWN
     ======================================================= */

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

  /* =======================================================
     SALES CHANNEL BREAKDOWN
     ======================================================= */

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

  /* =======================================================
     TOP PRODUCTS
     ======================================================= */

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

        const costPrice =
          Number(product?.cost_price || 0);

        const estimatedCost =
          costPrice * item.quantitySold;

        const estimatedProfit =
          item.revenue - estimatedCost;

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
          estimatedCost,
          estimatedProfit,
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

  /* =======================================================
     PROFIT SUMMARY
     ======================================================= */

  const profitSummary = useMemo(() => {
    const revenue = topProducts.reduce(
      (sum, item) =>
        sum + item.revenue,
      0
    );

    const estimatedCost = topProducts.reduce(
      (sum, item) =>
        sum + item.estimatedCost,
      0
    );

    const estimatedProfit =
      revenue - estimatedCost;

    return {
      revenue,
      estimatedCost,
      estimatedProfit,
    };
  }, [topProducts]);

  /* =======================================================
     CHART DATA
     ======================================================= */

  const chartData = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    const days = [];

    const cursor = new Date(start);

    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);

      /*
       * Prevent extremely large charts when someone selects
       * years of data.
       */
      if (days.length >= 31) {
        break;
      }
    }

    const dailySales = days.map((date) => {
      const dateKey = getDateString(date);

      const daySales = successfulOrders
        .filter((order) => {
          const orderDate = getDateString(
            new Date(order.created_at)
          );

          return orderDate === dateKey;
        })
        .reduce(
          (sum, order) =>
            sum + Number(order.total_amount || 0),
          0
        );

      return {
        key: date,
        data: daySales,
      };
    });

    return [
      {
        key: 'Sales',
        data: dailySales,
      },
    ];
  }, [
    startDate,
    endDate,
    successfulOrders,
  ]);

  /* =======================================================
     LOW STOCK
     ======================================================= */

  const lowStockProducts = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.active !== false &&
          Number(product.stock_quantity || 0) <=
            Number(product.low_stock_threshold || 5)
      )
      .sort(
        (a, b) =>
          Number(a.stock_quantity || 0) -
          Number(b.stock_quantity || 0)
      );
  }, [products]);

  /* =======================================================
     QUICK DATE FILTERS
     ======================================================= */

  const setToday = () => {
    const current = getToday();

    setStartDate(current);
    setEndDate(current);
  };

  const setLast7Days = () => {
    const end = new Date();
    const start = new Date();

    start.setDate(
      start.getDate() - 6
    );

    setStartDate(getDateString(start));
    setEndDate(getDateString(end));
  };

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();

    start.setDate(
      start.getDate() - 29
    );

    setStartDate(getDateString(start));
    setEndDate(getDateString(end));
  };

  const setThisMonth = () => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    setStartDate(getDateString(start));
    setEndDate(getDateString(now));
  };

  /* =======================================================
     METRIC CARDS
     ======================================================= */

  const metrics = [
    {
      id: 'sales',
      label: 'Total Sales',
      value: formatCompactCurrency(
        summary.totalSales
      ),
      description: 'Successful sales',
      icon: 'sales',
      className: 'metric-purple',
    },
    {
      id: 'orders',
      label: 'Successful Orders',
      value: summary.successfulOrders,
      description: `${summary.totalOrders} total orders`,
      icon: 'orders',
      className: 'metric-blue',
    },
    {
      id: 'average',
      label: 'Average Order',
      value: formatCompactCurrency(
        summary.averageOrderValue
      ),
      description: 'Average successful order',
      icon: 'average',
      className: 'metric-green',
    },
    {
      id: 'pending',
      label: 'Pending Orders',
      value: summary.pendingOrders,
      description: formatCurrency(
        summary.pendingAmount
      ),
      icon: 'pending',
      className: 'metric-orange',
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      value: summary.cancelledOrders,
      description: formatCurrency(
        summary.cancelledAmount
      ),
      icon: 'cancelled',
      className: 'metric-red',
    },
  ];

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="reports-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <motion.div
        className="reports-header"
        initial={{
          opacity: 0,
          y: -15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div>
          <div className="reports-title-row">
            <div className="reports-title-icon">
              <BarChart3 size={24} />
            </div>

            <div>
              <h1>Business Reports</h1>

              <p>
                Analyze Sleek Sisters sales,
                products and business performance.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="run-report-button"
          onClick={fetchReport}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? 'spin-icon'
                : ''
            }
          />

          {loading
            ? 'Loading...'
            : 'Run Report'}
        </button>
      </motion.div>

      {/* ===================================================
          DATE FILTER
      =================================================== */}

      <motion.section
        className="reports-filter"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.05,
        }}
      >
        <div className="filter-date-group">
          <label>
            <CalendarDays size={15} />
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

        <div className="filter-date-group">
          <label>
            <CalendarDays size={15} />
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
      </motion.section>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <motion.div
          className="reports-error"
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <AlertTriangle size={21} />

          <div>
            <strong>
              Report Error
            </strong>

            <p>{error}</p>
          </div>
        </motion.div>
      )}

      {/* ===================================================
          METRICS
      =================================================== */}

      <section className="reports-summary">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            className={`report-card ${metric.className}`}
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay:
                0.08 + index * 0.05,
            }}
          >
            <div className="metric-card-top">
              <div className="metric-icon">
                <MetricIcon
                  type={metric.icon}
                />
              </div>

              <span className="metric-label">
                {metric.label}
              </span>
            </div>

            <div className="metric-value">
              {metric.value}
            </div>

            <div className="metric-description">
              {metric.description}
            </div>
          </motion.div>
        ))}
      </section>

      {/* ===================================================
          SALES CHART
      =================================================== */}

      <section className="reports-grid">

        <motion.div
          className="reports-section sales-chart-section"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
        >
          <div className="reports-section-header">
            <div>
              <h2>Sales Performance</h2>

              <p>
                Daily successful sales for the
                selected period.
              </p>
            </div>

            <div className="chart-legend">
              <span className="legend-dot" />
              Sales
            </div>
          </div>

          <div className="sales-chart">
            {chartData[0]?.data?.length > 0 ? (
              <AreaChart
                height={280}
                id="jawabu-sales-chart"
                data={chartData}
                xAxis={
                  <LinearXAxis
                    type="time"
                    tickSeries={
                      <LinearXAxisTickSeries
                        label={
                          <LinearXAxisTickLabel
                            format={(value) =>
                              new Date(
                                value
                              ).toLocaleDateString(
                                'en-KE',
                                {
                                  month: 'numeric',
                                  day: 'numeric',
                                }
                              )
                            }
                            fill="#8B8494"
                          />
                        }
                        tickSize={8}
                      />
                    }
                  />
                }
                yAxis={
                  <LinearYAxis
                    axisLine={null}
                    tickSeries={
                      <LinearYAxisTickSeries
                        line={null}
                        label={null}
                        tickSize={8}
                      />
                    }
                  />
                }
                series={
                  <AreaSeries
                    type="grouped"
                    interpolation="smooth"
                    area={
                      <Area
                        gradient={
                          <Gradient
                            stops={[
                              <GradientStop
                                key="start"
                                stopOpacity={0.05}
                              />,
                              <GradientStop
                                key="end"
                                offset="100%"
                                stopOpacity={0.35}
                              />,
                            ]}
                          />
                        }
                      />
                    }
                    colorScheme={[
                      '#5B14C5',
                    ]}
                  />
                }
                gridlines={
                  <GridlineSeries
                    line={
                      <Gridline
                        strokeColor="#E8E2ED"
                      />
                    }
                  />
                }
              />
            ) : (
              <div className="empty-chart">
                No sales data for this period.
              </div>
            )}
          </div>
        </motion.div>

        {/* =================================================
            PROFIT CARD
        ================================================= */}

        <motion.div
          className="reports-section profit-card"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.25,
          }}
        >
          <div className="reports-section-header">
            <div>
              <h2>Profit Overview</h2>

              <p>
                Estimated performance from
                recorded product costs.
              </p>
            </div>

            <TrendingUp size={22} />
          </div>

          <div className="profit-main">
            <span>Estimated Profit</span>

            <strong>
              {formatCurrency(
                profitSummary.estimatedProfit
              )}
            </strong>
          </div>

          <div className="profit-row">
            <span>Revenue</span>
            <strong>
              {formatCurrency(
                profitSummary.revenue
              )}
            </strong>
          </div>

          <div className="profit-row">
            <span>Estimated Cost</span>
            <strong>
              {formatCurrency(
                profitSummary.estimatedCost
              )}
            </strong>
          </div>

          <div className="profit-note">
            Profit is estimated from
            <code>cost_price</code> on products.
          </div>
        </motion.div>
      </section>

      {/* ===================================================
          BREAKDOWNS
      =================================================== */}

      <section className="reports-grid">

        {/* PAYMENT */}

        <motion.div
          className="reports-section"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div className="reports-section-header">
            <div>
              <h2>Payment Methods</h2>

              <p>
                Successful sales by payment
                method.
              </p>
            </div>

            <CreditCard size={22} />
          </div>

          {paymentBreakdown.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={30} />
              <p>
                No payment data for this
                period.
              </p>
            </div>
          ) : (
            <div className="breakdown-list">
              {paymentBreakdown.map(
                (item, index) => {
                  const percentage =
                    summary.totalSales > 0
                      ? (item.totalAmount /
                          summary.totalSales) *
                        100
                      : 0;

                  return (
                    <div
                      className="breakdown-item"
                      key={item.method}
                    >
                      <div className="breakdown-main">
                        <div className="breakdown-rank">
                          {index + 1}
                        </div>

                        <div>
                          <strong>
                            {normalizeLabel(
                              item.method
                            )}
                          </strong>

                          <span>
                            {item.orderCount}{' '}
                            orders
                          </span>
                        </div>
                      </div>

                      <div className="breakdown-value">
                        <strong>
                          {formatCurrency(
                            item.totalAmount
                          )}
                        </strong>

                        <span>
                          {percentage.toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </motion.div>

        {/* CHANNEL */}

        <motion.div
          className="reports-section"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div className="reports-section-header">
            <div>
              <h2>Sales Channels</h2>

              <p>
                Performance by sales
                channel.
              </p>
            </div>

            <Store size={22} />
          </div>

          {channelBreakdown.length === 0 ? (
            <div className="empty-state">
              <Store size={30} />
              <p>
                No channel data for this
                period.
              </p>
            </div>
          ) : (
            <div className="breakdown-list">
              {channelBreakdown.map(
                (item, index) => {
                  const percentage =
                    summary.totalSales > 0
                      ? (item.totalAmount /
                          summary.totalSales) *
                        100
                      : 0;

                  return (
                    <div
                      className="breakdown-item"
                      key={item.channel}
                    >
                      <div className="breakdown-main">
                        <div className="breakdown-rank">
                          {index + 1}
                        </div>

                        <div>
                          <strong>
                            {normalizeLabel(
                              item.channel
                            )}
                          </strong>

                          <span>
                            {item.orderCount}{' '}
                            orders
                          </span>
                        </div>
                      </div>

                      <div className="breakdown-value">
                        <strong>
                          {formatCurrency(
                            item.totalAmount
                          )}
                        </strong>

                        <span>
                          {percentage.toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </motion.div>
      </section>

      {/* ===================================================
          TOP PRODUCTS
      =================================================== */}

      <motion.section
        className="reports-section"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div className="reports-section-header">
          <div>
            <h2>Top Products</h2>

            <p>
              Best-performing products during
              the selected period.
            </p>
          </div>

          <Package size={22} />
        </div>

        {topProducts.length === 0 ? (
          <div className="empty-state">
            <Package size={30} />

            <p>
              No product sales for this
              period.
            </p>
          </div>
        ) : (
          <div className="reports-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Estimated Profit</th>
                </tr>
              </thead>

              <tbody>
                {topProducts.map(
                  (item, index) => (
                    <tr
                      key={item.productId}
                    >
                      <td>
                        <span className="table-rank">
                          {index + 1}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {item.productName}
                        </strong>
                      </td>

                      <td>
                        {item.quantitySold}
                      </td>

                      <td>
                        {item.orderCount}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            item.revenue
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            item.estimatedProfit >=
                            0
                              ? 'profit-positive'
                              : 'profit-negative'
                          }
                        >
                          {formatCurrency(
                            item.estimatedProfit
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* ===================================================
          INVENTORY ALERTS
      =================================================== */}

      <motion.section
        className="reports-section inventory-alert-section"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div className="reports-section-header">
          <div>
            <h2>Inventory Alerts</h2>

            <p>
              Products currently at or below
              their low-stock threshold.
            </p>
          </div>

          <AlertTriangle size={22} />
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="inventory-good">
            <CheckCircle2 size={24} />

            <div>
              <strong>
                Inventory looks healthy
              </strong>

              <span>
                No products are currently
                below their low-stock threshold.
              </span>
            </div>
          </div>
        ) : (
          <div className="inventory-alert-list">
            {lowStockProducts
              .slice(0, 8)
              .map((product) => (
                <div
                  className="inventory-alert"
                  key={product.id}
                >
                  <Package size={19} />

                  <div>
                    <strong>
                      {product.name}
                    </strong>

                    <span>
                      Current stock:{' '}
                      {product.stock_quantity}
                    </span>
                  </div>

                  <span className="stock-warning">
                    Low Stock
                  </span>
                </div>
              ))}
          </div>
        )}
      </motion.section>

      {/* ===================================================
          REPORT FOOTER
      =================================================== */}

      <div className="reports-footer">
        <span>
          Report period:
        </span>

        <strong>
          {formatDate(
            `${startDate}T00:00:00`
          )}
          {' — '}
          {formatDate(
            `${endDate}T00:00:00`
          )}
        </strong>

        <span>
          •
        </span>

        <span>
          {summary.totalOrders} orders
          analyzed
        </span>
      </div>
    </div>
  );
}

export default Reports;