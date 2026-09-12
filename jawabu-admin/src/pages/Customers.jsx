import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  X,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Loader2,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import './customers.css';

function Customers() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // =========================================================
  // LOAD ORDERS
  // =========================================================

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  const fetchCustomerOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        first_name,
        last_name,
        email,
        phone,
        city,
        delivery_address,
        total_amount,
        delivery_fee,
        status,
        payment_status,
        payment_method,
        sales_channel,
        order_date,
        created_at
      `)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        'Error loading customer orders:',
        error
      );

      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  // =========================================================
  // BUILD CUSTOMER LIST
  // =========================================================

  const customers = useMemo(() => {
    const customerMap = new Map();

    orders.forEach((order) => {
      const email = (order.email || '')
        .trim()
        .toLowerCase();

      const phone = (order.phone || '')
        .trim();

      /*
       * Prefer email as the customer identifier.
       * If there is no email, use phone.
       * If neither exists, use a fallback based on
       * the customer's name.
       */

      const name = `${order.first_name || ''} ${
        order.last_name || ''
      }`.trim();

      const key =
        email ||
        phone ||
        name.toLowerCase() ||
        `customer-${order.id}`;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          key,
          first_name: order.first_name || '',
          last_name: order.last_name || '',
          email: order.email || '',
          phone: order.phone || '',
          city: order.city || '',
          delivery_address:
            order.delivery_address || '',
          orders: [],
          totalSpent: 0,
          lastOrderDate:
            order.created_at ||
            order.order_date ||
            null,
        });
      }

      const customer =
        customerMap.get(key);

      customer.orders.push(order);

      customer.totalSpent += Number(
        order.total_amount || 0
      );

      const currentDate =
        order.created_at ||
        order.order_date;

      if (
        currentDate &&
        (!customer.lastOrderDate ||
          new Date(currentDate) >
            new Date(customer.lastOrderDate))
      ) {
        customer.lastOrderDate =
          currentDate;
      }

      /*
       * Fill missing information from later orders.
       */

      if (!customer.first_name && order.first_name) {
        customer.first_name =
          order.first_name;
      }

      if (!customer.last_name && order.last_name) {
        customer.last_name =
          order.last_name;
      }

      if (!customer.email && order.email) {
        customer.email =
          order.email;
      }

      if (!customer.phone && order.phone) {
        customer.phone =
          order.phone;
      }

      if (!customer.city && order.city) {
        customer.city =
          order.city;
      }

      if (
        !customer.delivery_address &&
        order.delivery_address
      ) {
        customer.delivery_address =
          order.delivery_address;
      }
    });

    return Array.from(
      customerMap.values()
    ).sort(
      (a, b) =>
        new Date(b.lastOrderDate || 0) -
        new Date(a.lastOrderDate || 0)
    );
  }, [orders]);

  // =========================================================
  // SEARCH CUSTOMERS
  // =========================================================

  const filteredCustomers = useMemo(() => {
    const text =
      search.toLowerCase().trim();

    if (!text) {
      return customers;
    }

    return customers.filter(
      (customer) => {
        const fullName =
          `${customer.first_name} ${customer.last_name}`
            .toLowerCase();

        return (
          fullName.includes(text) ||
          customer.email
            .toLowerCase()
            .includes(text) ||
          customer.phone
            .toLowerCase()
            .includes(text) ||
          customer.city
            .toLowerCase()
            .includes(text)
        );
      }
    );
  }, [customers, search]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalCustomers =
    customers.length;

  const totalCustomerRevenue =
    customers.reduce(
      (sum, customer) =>
        sum + customer.totalSpent,
      0
    );

  const totalCustomerOrders =
    orders.length;

  const averageCustomerValue =
    totalCustomers > 0
      ? totalCustomerRevenue /
        totalCustomers
      : 0;

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
  // DATE
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
  // CUSTOMER NAME
  // =========================================================

  const getCustomerName = (
    customer
  ) => {
    const name =
      `${customer.first_name || ''} ${
        customer.last_name || ''
      }`.trim();

    return name || 'Walk-in Customer';
  };

  // =========================================================
  // OPEN CUSTOMER
  // =========================================================

  const openCustomer = (
    customer
  ) => {
    setSelectedCustomer(
      customer
    );
  };

  // =========================================================
  // CLOSE CUSTOMER
  // =========================================================

  const closeCustomer = () => {
    setSelectedCustomer(null);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="customers-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="customers-header">

        <div>
          <div className="customers-title-row">

            <div className="customers-title-icon">
              <Users size={24} />
            </div>

            <div>
              <h1>
                Customers
              </h1>

              <p>
                Manage customer information
                and purchase history.
              </p>
            </div>

          </div>
        </div>

        <button
          type="button"
          className="customers-refresh-button"
          onClick={
            fetchCustomerOrders
          }
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? 'is-spinning'
                : ''
            }
          />

          Refresh
        </button>

      </div>


      {/* ===================================================
          STATISTICS
      =================================================== */}

      <div className="customer-stat-grid">

        <div className="customer-stat-card">

          <div className="customer-stat-icon">
            <Users size={20} />
          </div>

          <div>
            <span>
              Total Customers
            </span>

            <strong>
              {totalCustomers}
            </strong>
          </div>

        </div>


        <div className="customer-stat-card">

          <div className="customer-stat-icon">
            <ShoppingBag size={20} />
          </div>

          <div>
            <span>
              Total Orders
            </span>

            <strong>
              {totalCustomerOrders}
            </strong>
          </div>

        </div>


        <div className="customer-stat-card">

          <div className="customer-stat-icon">
            <span>
              KSh
            </span>
          </div>

          <div>
            <span>
              Customer Revenue
            </span>

            <strong>
              {formatCurrency(
                totalCustomerRevenue
              )}
            </strong>
          </div>

        </div>


        <div className="customer-stat-card">

          <div className="customer-stat-icon">
            <span>
              ↗
            </span>
          </div>

          <div>
            <span>
              Average Customer Value
            </span>

            <strong>
              {formatCurrency(
                averageCustomerValue
              )}
            </strong>
          </div>

        </div>

      </div>


      {/* ===================================================
          CUSTOMER LIST
      =================================================== */}

      <section className="customers-card">

        <div className="customers-card-header">

          <div>
            <h2>
              Customer Directory
            </h2>

            <p>
              {filteredCustomers.length}{' '}
              customer
              {filteredCustomers.length ===
              1
                ? ''
                : 's'}
            </p>
          </div>


          <div className="customer-search">

            <Search size={17} />

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

        </div>


        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="customers-empty">

            <Loader2
              size={28}
              className="is-spinning"
            />

            <p>
              Loading customers...
            </p>

          </div>

        ) : filteredCustomers.length ===
          0 ? (

          <div className="customers-empty">

            <div className="customers-empty-icon">
              <Users size={38} />
            </div>

            <h3>
              No customers found
            </h3>

            <p>
              {customers.length === 0
                ? 'Customers will appear here after orders are created.'
                : 'Try changing your search.'}
            </p>

          </div>

        ) : (

          <div className="customers-table-wrapper">

            <table className="customers-table">

              <thead>

                <tr>

                  <th>
                    Customer
                  </th>

                  <th>
                    Contact
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Orders
                  </th>

                  <th>
                    Total Spent
                  </th>

                  <th>
                    Last Order
                  </th>

                  <th>
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredCustomers.map(
                  (customer) => (

                    <tr
                      key={
                        customer.key
                      }
                    >

                      {/* CUSTOMER */}

                      <td>

                        <div className="customer-table-name">

                          <div className="customer-avatar">
                            {getCustomerName(
                              customer
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>

                            <strong>
                              {getCustomerName(
                                customer
                              )}
                            </strong>

                            <small>
                              {customer.email ||
                                customer.phone ||
                                'No contact information'}
                            </small>

                          </div>

                        </div>

                      </td>


                      {/* CONTACT */}

                      <td>

                        <div className="customer-contact-item">

                          <Mail size={14} />

                          <span>
                            {customer.email ||
                              '—'}
                          </span>

                        </div>

                        <div className="customer-contact-item">

                          <Phone size={14} />

                          <span>
                            {customer.phone ||
                              '—'}
                          </span>

                        </div>

                      </td>


                      {/* LOCATION */}

                      <td>

                        <div className="customer-contact-item">

                          <MapPin size={14} />

                          <span>
                            {customer.city ||
                              '—'}
                          </span>

                        </div>

                      </td>


                      {/* ORDERS */}

                      <td>

                        <span className="customer-order-count">

                          <ShoppingBag
                            size={14}
                          />

                          {
                            customer
                              .orders
                              .length
                          }

                        </span>

                      </td>


                      {/* TOTAL */}

                      <td>

                        <strong>
                          {formatCurrency(
                            customer.totalSpent
                          )}
                        </strong>

                      </td>


                      {/* LAST ORDER */}

                      <td>

                        <span className="customer-last-order">

                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            customer.lastOrderDate
                          )}

                        </span>

                      </td>


                      {/* VIEW */}

                      <td>

                        <button
                          type="button"
                          className="customer-view-button"
                          onClick={() =>
                            openCustomer(
                              customer
                            )
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

      </section>


      {/* ===================================================
          CUSTOMER MODAL
      =================================================== */}

      {selectedCustomer && (

        <div
          className="customer-modal-overlay"
          onClick={
            closeCustomer
          }
        >

          <div
            className="customer-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="customer-modal-header">

              <div className="customer-modal-title">

                <div className="customer-large-avatar">
                  {getCustomerName(
                    selectedCustomer
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <h2>
                    {getCustomerName(
                      selectedCustomer
                    )}
                  </h2>

                  <p>
                    Customer profile
                  </p>

                </div>

              </div>


              <button
                type="button"
                className="customer-close-button"
                onClick={
                  closeCustomer
                }
              >
                <X size={19} />
              </button>

            </div>


            {/* CUSTOMER INFORMATION */}

            <div className="customer-profile-grid">

              <div className="customer-profile-item">

                <Mail size={17} />

                <div>

                  <span>
                    Email
                  </span>

                  <strong>
                    {selectedCustomer.email ||
                      '—'}
                  </strong>

                </div>

              </div>


              <div className="customer-profile-item">

                <Phone size={17} />

                <div>

                  <span>
                    Phone
                  </span>

                  <strong>
                    {selectedCustomer.phone ||
                      '—'}
                  </strong>

                </div>

              </div>


              <div className="customer-profile-item">

                <MapPin size={17} />

                <div>

                  <span>
                    City
                  </span>

                  <strong>
                    {selectedCustomer.city ||
                      '—'}
                  </strong>

                </div>

              </div>


              <div className="customer-profile-item">

                <ShoppingBag size={17} />

                <div>

                  <span>
                    Total Orders
                  </span>

                  <strong>
                    {
                      selectedCustomer
                        .orders
                        .length
                    }
                  </strong>

                </div>

              </div>

            </div>


            {/* CUSTOMER SUMMARY */}

            <div className="customer-summary">

              <div>

                <span>
                  Total Spent
                </span>

                <strong>
                  {formatCurrency(
                    selectedCustomer.totalSpent
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Average Order
                </span>

                <strong>
                  {formatCurrency(
                    selectedCustomer
                      .orders
                      .length > 0
                      ? selectedCustomer.totalSpent /
                          selectedCustomer
                            .orders
                            .length
                      : 0
                  )}
                </strong>

              </div>

            </div>


            {/* ADDRESS */}

            <div className="customer-address">

              <h3>
                Delivery Information
              </h3>

              <p>
                {selectedCustomer
                  .delivery_address ||
                  'No delivery address recorded.'}
              </p>

            </div>


            {/* ORDER HISTORY */}

            <div className="customer-history">

              <div className="customer-history-header">

                <div>

                  <h3>
                    Order History
                  </h3>

                  <p>
                    Previous purchases
                  </p>

                </div>

              </div>


              {selectedCustomer.orders.length ===
              0 ? (

                <p>
                  No orders found.
                </p>

              ) : (

                <div className="customer-order-history">

                  {selectedCustomer.orders.map(
                    (order) => (

                      <div
                        className="customer-order-row"
                        key={
                          order.id
                        }
                      >

                        <div>

                          <strong>
                            #
                            {order.order_number ||
                              order.id}
                          </strong>

                          <small>
                            {formatDate(
                              order.created_at ||
                                order.order_date
                            )}
                          </small>

                        </div>


                        <div>

                          <span
                            className={`customer-order-status ${
                              (
                                order.status ||
                                ''
                              ).toLowerCase()
                            }`}
                          >
                            {order.status ||
                              'pending'}
                          </span>

                        </div>


                        <strong>
                          {formatCurrency(
                            order.total_amount
                          )}
                        </strong>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Customers;