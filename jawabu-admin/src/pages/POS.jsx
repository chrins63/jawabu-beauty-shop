import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dispatchSms, subscribeToSms } from '../lib/sms';
import { dispatchEmail, subscribeToEmail } from '../lib/email';
import {
  applyVariantToProduct,
  posLineId,
  selectableVariants,
  variantDisplayLabel,
} from '../lib/productOptions';
import './pos.css';

function POS() {
  // =========================================================
  // STATE
  // =========================================================

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cart, setCart] = useState([]);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [cashTendered, setCashTendered] = useState('');

  const [customer, setCustomer] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [notes, setNotes] = useState('');

  const [checkingOut, setCheckingOut] = useState(false);

  // Prevents rapid double checkout before React re-renders.
  const checkoutLockRef = useRef(false);

  const [checkoutError, setCheckoutError] = useState('');
  const [variantPickerProduct, setVariantPickerProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [completedOrderId, setCompletedOrderId] = useState(null);

  const [receiptData, setReceiptData] = useState(null);

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        cost_price,
        stock_quantity,
        sku,
        barcode,
        image_url,
        low_stock_threshold,
        category,
        active,
        product_variants (
          id,
          option_type,
          option_value,
          sku,
          price,
          stock_quantity,
          image_url,
          available,
          sort_order
        )
      `)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading POS products:', error);
      setCheckoutError(error.message || 'Unable to load products.');
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  };

  // =========================================================
  // CATEGORIES
  // =========================================================

  const categories = useMemo(() => {
    const uniqueCategories = products
      .map((product) => product.category)
      .filter(
        (category) =>
          typeof category === 'string' &&
          category.trim() !== ''
      );

    return [...new Set(uniqueCategories)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [products]);

  // =========================================================
  // SEARCH + CATEGORY FILTER
  // =========================================================

  const filteredProducts = useMemo(() => {
    const text = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !text ||
        (product.name || '').toLowerCase().includes(text) ||
        (product.sku || '').toLowerCase().includes(text) ||
        (product.barcode || '').toLowerCase().includes(text);

      const matchesCategory =
        categoryFilter === 'all' ||
        (product.category || '') === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  // =========================================================
  // BARCODE / SKU ENTER
  // =========================================================

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const code = search.trim().toLowerCase();

    if (!code) {
      return;
    }

    let matchedProduct = null;
    let matchedVariant = null;

    for (const product of products) {
      const variant = selectableVariants(product).find((row) =>
        (row.sku || '').trim().toLowerCase() === code
      );

      if (variant) {
        matchedProduct = product;
        matchedVariant = variant;
        break;
      }
    }

    if (!matchedProduct) {
      matchedProduct = products.find((product) => {
        const sku = (product.sku || '').trim().toLowerCase();
        const barcode = (product.barcode || '')
          .trim()
          .toLowerCase();

        return sku === code || barcode === code;
      });
    }

    if (!matchedProduct) {
      setCheckoutError(
        `No exact SKU or barcode match found for "${search.trim()}".`
      );
      return;
    }

    addToCart(matchedProduct, matchedVariant);

    setSearch('');
    setCheckoutError('');
  };

  // =========================================================
  // CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    return `KSh ${Number(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================================
  // ADD TO CART
  // =========================================================

  const addToCart = (product, variant = null) => {
    setCheckoutError('');
    setSuccessMessage('');
    setCompletedOrderId(null);

    const options = selectableVariants(product);

    if (options.length && !variant) {
      setVariantPickerProduct(product);
      return;
    }

    if (variant && variant.available === false) {
      setCheckoutError(
        `${product.name} (${variant.option_value}) is not available.`
      );
      return;
    }

    const priced = applyVariantToProduct(product, variant);
    const availableStock = Number(priced.stock_quantity || 0);
    const label = variantDisplayLabel(variant);
    const displayName = label ? `${product.name} (${label})` : product.name;
    const lineId = posLineId(product.id, variant?.id);

    if (availableStock <= 0) {
      setCheckoutError(
        `${displayName} is out of stock.`
      );
      return;
    }

    setVariantPickerProduct(null);

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.lineId === lineId
      );

      if (existing) {
        if (existing.quantity >= availableStock) {
          setCheckoutError(
            `Only ${availableStock} units of ${displayName} are available.`
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          product: priced,
          variant_id: variant?.id || null,
          variant_label: label,
          lineId,
          quantity: 1,
          discountPercent: 0,
        },
      ];
    });
  };

  // =========================================================
  // CHANGE QUANTITY
  // =========================================================

  const changeQuantity = (lineId, newQuantity) => {
    const amount = Number(newQuantity);

    if (!Number.isInteger(amount)) {
      return;
    }

    if (amount <= 0) {
      removeFromCart(lineId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.lineId !== lineId) {
          return item;
        }

        const available = Number(
          item.product.stock_quantity || 0
        );
        const displayName = item.variant_label
          ? `${item.product.name} (${item.variant_label})`
          : item.product.name;

        if (amount > available) {
          setCheckoutError(
            `Only ${available} units of ${displayName} are available.`
          );
        } else {
          setCheckoutError('');
        }

        return {
          ...item,
          quantity: Math.min(amount, available),
        };
      })
    );
  };

  // =========================================================
  // CHANGE DISCOUNT
  // =========================================================

  const changeDiscount = (lineId, discountValue) => {
    let discount = Number(discountValue);

    if (Number.isNaN(discount)) {
      discount = 0;
    }

    discount = Math.max(
      0,
      Math.min(100, discount)
    );

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              discountPercent: discount,
            }
          : item
      )
    );
  };

  // =========================================================
  // REMOVE FROM CART
  // =========================================================

  const removeFromCart = (lineId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.lineId !== lineId
      )
    );
  };

  // =========================================================
  // CART CALCULATIONS
  // =========================================================

  const cartCalculations = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let finalSubtotal = 0;

    const calculatedItems = cart.map((item) => {
      const price = Number(
        item.product.price || 0
      );

      const quantity = Number(
        item.quantity || 0
      );

      const discountPercent = Number(
        item.discountPercent || 0
      );

      const lineGross =
        price * quantity;

      const lineDiscount =
        lineGross *
        (discountPercent / 100);

      const lineTotal =
        lineGross - lineDiscount;

      grossSubtotal += lineGross;
      totalDiscount += lineDiscount;
      finalSubtotal += lineTotal;

      return {
        ...item,
        price,
        quantity,
        discountPercent,
        lineGross,
        lineDiscount,
        lineTotal,
      };
    });

    return {
      items: calculatedItems,
      grossSubtotal,
      totalDiscount,
      finalSubtotal,
    };
  }, [cart]);

  const {
    items: calculatedCart,
    grossSubtotal,
    totalDiscount,
    finalSubtotal,
  } = cartCalculations;

  // =========================================================
  // DELIVERY
  // =========================================================

  const numericDeliveryFee = Number(
    deliveryFee || 0
  );

  const total =
    finalSubtotal +
    numericDeliveryFee;

  // =========================================================
  // CASH CALCULATIONS
  // =========================================================

  const numericCashTendered = Number(
    cashTendered || 0
  );

  const changeDue = Math.max(
    0,
    numericCashTendered - total
  );

  const cashIsInsufficient =
    paymentMethod === 'cash' &&
    cart.length > 0 &&
    numericCashTendered < total;

  // =========================================================
  // RESET SALE
  // =========================================================

  const resetSale = () => {
    setCart([]);
    setSearch('');
    setCategoryFilter('all');

    setPaymentMethod('cash');
    setTransactionId('');
    setCashTendered('');

    setCustomer({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
    });

    setDeliveryAddress('');
    setCity('');
    setDeliveryFee('0');
    setNotes('');

    setCheckoutError('');
    setSuccessMessage('');
    setCompletedOrderId(null);
  };

  // =========================================================
  // PRINT RECEIPT
  // =========================================================

  const printReceipt = () => {
    window.print();
  };

  const closeReceipt = () => {
    setReceiptData(null);
  };

  // =========================================================
  // CHECKOUT
  // =========================================================

  const handleCheckout = async (event) => {
    event.preventDefault();

    // -------------------------------------------------------
    // HARD LOCK
    // -------------------------------------------------------

    if (checkoutLockRef.current) {
      return;
    }

    checkoutLockRef.current = true;
    setCheckingOut(true);

    setCheckoutError('');
    setSuccessMessage('');

    try {
      // =====================================================
      // VALIDATE SESSION
      // =====================================================

      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !currentSession
      ) {
        throw new Error(
          'Your session has expired. Please log in again.'
        );
      }

      const currentUserId =
        currentSession.user?.id;

      if (!currentUserId) {
        throw new Error(
          'Unable to identify the logged-in user. Please log in again.'
        );
      }

      // =====================================================
      // VALIDATE CART
      // =====================================================

      if (cart.length === 0) {
        throw new Error(
          'Your cart is empty.'
        );
      }

      // =====================================================
      // VALIDATE TOTAL
      // =====================================================

      if (
        Number.isNaN(finalSubtotal) ||
        finalSubtotal < 0
      ) {
        throw new Error(
          'The sale subtotal is invalid.'
        );
      }

      if (
        Number.isNaN(numericDeliveryFee) ||
        numericDeliveryFee < 0
      ) {
        throw new Error(
          'Delivery fee is invalid.'
        );
      }

      if (
        Number.isNaN(total) ||
        total < 0
      ) {
        throw new Error(
          'The sale total is invalid.'
        );
      }

      // =====================================================
      // VALIDATE CART STOCK BEFORE RPC
      // =====================================================

      for (const item of cart) {
        const quantity = Number(
          item.quantity || 0
        );

        const stock = Number(
          item.product.stock_quantity || 0
        );

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Invalid quantity for ${item.product.name}.`
          );
        }

        if (quantity > stock) {
          throw new Error(
            `Not enough stock for ${item.product.name}. Available: ${stock}.`
          );
        }
      }

      // =====================================================
      // VALIDATE CASH
      // =====================================================

      if (paymentMethod === 'cash') {
        if (
          Number.isNaN(numericCashTendered) ||
          numericCashTendered < total
        ) {
          throw new Error(
            `Insufficient cash. Required: ${formatCurrency(
              total
            )}. Received: ${formatCurrency(
              numericCashTendered
            )}.`
          );
        }
      }

      if (paymentMethod === 'mpesa' && !transactionId.trim()) {
        throw new Error(
          'Enter the M-Pesa confirmation code from the customer before completing the sale.'
        );
      }

      // =====================================================
      // BUILD ORDER PAYLOAD
      // =====================================================

      const orderPayload = {
        order_date: new Date().toISOString(),

        total_amount: Number(
          total.toFixed(2)
        ),

        status: 'delivered',

        payment_status: 'paid',

        payment_method:
          paymentMethod,

        transaction_id:
          transactionId.trim() || null,

        notes:
          notes.trim() || null,

        first_name:
          customer.first_name.trim() ||
          null,

        last_name:
          customer.last_name.trim() ||
          null,

        phone:
          customer.phone.trim() ||
          null,

        email:
          customer.email.trim() ||
          null,

        delivery_address:
          deliveryAddress.trim() ||
          null,

        city:
          city.trim() || null,

        delivery_fee:
          Number(
            numericDeliveryFee.toFixed(2)
          ),

        // This is a physical POS sale.
        sales_channel: 'physical',

        sold_by: currentUserId,
      };

      // =====================================================
      // BUILD ORDER ITEMS
      // =====================================================

      const itemsPayload =
        calculatedCart.map((item) => {
          const discountedUnitPrice =
            item.quantity > 0
              ? item.lineTotal /
                item.quantity
              : 0;

          return {
            product_id:
              item.product.id,

            quantity:
              item.quantity,

            variant_id:
              item.variant_id || null,

            price_at_purchase:
              Number(
                discountedUnitPrice.toFixed(2)
              ),
          };
        });

      // =====================================================
      // ATOMIC RPC
      //
      // create_pos_sale should:
      // 1. Create the order
      // 2. Create order_items
      // 3. Lock/check stock
      // 4. Reduce stock
      // 5. Commit everything atomically
      //
      // If anything fails, the complete transaction
      // should roll back.
      // =====================================================

      const {
        data: rpcResult,
        error: rpcError,
      } = await supabase.rpc(
        'create_pos_sale',
        {
          p_order: orderPayload,
          p_items: itemsPayload,
        }
      );

      if (rpcError) {
        console.error(
          'POS sale failed:',
          rpcError
        );

        throw new Error(
          rpcError.message ||
            'Unable to complete sale.'
        );
      }

      // =====================================================
      // GET NEW ORDER ID
      // =====================================================

      const newOrderId =
        rpcResult?.order_id;

      if (!newOrderId) {
        throw new Error(
          'Sale completed but no order ID was returned.'
        );
      }

      if (customer.phone.trim()) {
        await subscribeToSms({
          supabase,
          phone: customer.phone.trim(),
          name: `${customer.first_name} ${customer.last_name}`.trim(),
          source: 'pos',
        });
      }

      if (customer.email.trim()) {
        await subscribeToEmail({
          supabase,
          email: customer.email.trim(),
          name: `${customer.first_name} ${customer.last_name}`.trim(),
          source: 'pos',
        });
      }

      dispatchSms(supabase, { action: 'flush' }).catch((smsError) => {
        console.error('SMS dispatch after POS sale:', smsError);
      });
      dispatchEmail(supabase, { action: 'flush' }).catch((emailError) => {
        console.error('Email dispatch after POS sale:', emailError);
      });

      // =====================================================
      // SAVE RECEIPT DATA
      // =====================================================

      setReceiptData({
        orderId: newOrderId,

        date: new Date().toLocaleString(
          'en-KE'
        ),

        items:
          calculatedCart.map((item) => ({
            name: item.variant_label
              ? `${item.product.name} (${item.variant_label})`
              : item.product.name,

            quantity:
              item.quantity,

            price:
              item.price,

            discountPercent:
              item.discountPercent,

            lineGross:
              item.lineGross,

            lineDiscount:
              item.lineDiscount,

            lineTotal:
              item.lineTotal,
          })),

        grossSubtotal,

        totalDiscount,

        subtotal:
          finalSubtotal,

        deliveryFee:
          numericDeliveryFee,

        total,

        paymentMethod,

        transactionId:
          transactionId.trim(),

        cashTendered:
          paymentMethod === 'cash'
            ? numericCashTendered
            : 0,

        changeDue:
          paymentMethod === 'cash'
            ? changeDue
            : 0,

        customer: {
          ...customer,
        },

        city,

        deliveryAddress,

        notes,
      });

      // =====================================================
      // SUCCESS
      // =====================================================

      setCompletedOrderId(
        newOrderId
      );

      setSuccessMessage(
        `Sale completed successfully. Order #${newOrderId}`
      );

      // Clear current sale
      setCart([]);

      setTransactionId('');
      setCashTendered('');

      setCustomer({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
      });

      setDeliveryAddress('');
      setCity('');
      setDeliveryFee('0');
      setNotes('');

      // Refresh inventory
      await fetchProducts();
    } catch (err) {
      console.error(
        'Checkout failed:',
        err
      );

      setCheckoutError(
        err?.message ||
          'Unable to complete sale.'
      );
    } finally {
      // =====================================================
      // ALWAYS RELEASE LOCK
      // =====================================================

      checkoutLockRef.current = false;
      setCheckingOut(false);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="pos-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="pos-header">

        <div>
          <h1>
            Point of Sale
          </h1>

          <p>
            Create and process
            Sleek Sisters sales.
          </p>
        </div>

        <button
          type="button"
          className="pos-refresh-button"
          onClick={fetchProducts}
          disabled={loadingProducts}
        >
          ↻ Refresh Products
        </button>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {checkoutError && (
        <div className="pos-error">

          <strong>
            Checkout Error
          </strong>

          <p>
            {checkoutError}
          </p>

        </div>
      )}

      {/* ===================================================
          SUCCESS
      =================================================== */}

      {successMessage && (
        <div className="pos-success">

          <strong>
            ✓ Sale Completed
          </strong>

          <p>
            {successMessage}
          </p>

          {completedOrderId && (
            <span>
              Order #{completedOrderId}
            </span>
          )}

        </div>
      )}

      {/* ===================================================
          MAIN POS
      =================================================== */}

      <div className="pos-layout">

        {/* =================================================
            PRODUCTS PANEL
        ================================================= */}

        <section className="pos-products-panel">

          <div className="pos-panel-header">

            <div>
              <h2>
                Products
              </h2>

              <p>
                Search, scan or select a product.
              </p>
            </div>

          </div>

          {/* SEARCH */}

          <div className="pos-search-wrapper">

            <span>
              🔍
            </span>

            <input
              type="text"
              placeholder="Scan barcode / SKU or search product..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              autoComplete="off"
            />

          </div>

          <small className="pos-search-hint">
            Scan a barcode or enter an exact SKU,
            then press Enter.
          </small>

          {/* CATEGORY */}

          <div className="pos-category-filter">

            <label>
              Category
            </label>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}

            </select>

          </div>

          {/* PRODUCTS */}

          {loadingProducts ? (

            <div className="pos-empty">
              Loading products...
            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="pos-empty">

              <div>
                📦
              </div>

              <h3>
                No products found
              </h3>

              <p>
                Try another search or category.
              </p>

            </div>

          ) : (

            <div className="pos-product-grid">

              {filteredProducts.map(
                (product) => {

                  const stock =
                    Number(
                      product.stock_quantity ||
                        0
                    );

                  const lowStockThreshold =
                    Number(
                      product.low_stock_threshold ||
                        0
                    );

                  const outOfStock =
                    stock <= 0;

                  const isLowStock =
                    !outOfStock &&
                    stock <=
                      lowStockThreshold;

                  const options = selectableVariants(product);
                  const optionKind =
                    options[0]?.option_type === 'size' ? 'Sizes' : 'Colours';

                  return (

                    <button
                      type="button"
                      key={product.id}
                      className={`pos-product-card ${
                        outOfStock
                          ? 'out-of-stock'
                          : ''
                      }`}
                      onClick={() =>
                        addToCart(product)
                      }
                      disabled={
                        outOfStock ||
                        checkingOut
                      }
                    >

                      <div className="pos-product-image">

                        {product.image_url ? (

                          <img
                            src={
                              product.image_url
                            }
                            alt={
                              product.name
                            }
                          />

                        ) : (

                          <span>
                            📦
                          </span>

                        )}

                      </div>

                      <div className="pos-product-info">

                        <strong>
                          {product.name}
                        </strong>

                        <small>
                          {product.sku ||
                            'No SKU'}
                        </small>

                        {options.length ? (
                          <small>
                            {optionKind}: choose on add
                          </small>
                        ) : null}

                        {product.category && (
                          <small>
                            {
                              product.category
                            }
                          </small>
                        )}

                        <span className="pos-product-price">
                          {formatCurrency(
                            product.price
                          )}
                        </span>

                        <span
                          className={
                            outOfStock
                              ? 'pos-stock out'
                              : isLowStock
                                ? 'pos-stock low'
                                : 'pos-stock'
                          }
                        >
                          {outOfStock
                            ? 'Out of stock'
                            : `${stock} in stock`}
                        </span>

                      </div>

                    </button>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* =================================================
            CART PANEL
        ================================================= */}

        <section className="pos-cart-panel">

          <div className="pos-panel-header">

            <div>

              <h2>
                Current Sale
              </h2>

              <p>
                {cart.length}{' '}
                product
                {cart.length === 1
                  ? ''
                  : 's'}
              </p>

            </div>

            {cart.length > 0 && (
              <button
                type="button"
                className="pos-clear-cart"
                onClick={resetSale}
                disabled={checkingOut}
              >
                Clear
              </button>
            )}

          </div>

          {/* EMPTY CART */}

          {cart.length === 0 ? (

            <div className="pos-cart-empty">

              <div className="pos-cart-empty-icon">
                🛒
              </div>

              <h3>
                Cart is empty
              </h3>

              <p>
                Select products
                to begin a sale.
              </p>

            </div>

          ) : (

            <div className="pos-cart-items">

              {calculatedCart.map(
                (item) => (

                  <div
                    className="pos-cart-item"
                    key={
                      item.lineId || item.product.id
                    }
                  >

                    <div className="pos-cart-item-image">

                      {item.product.image_url ? (

                        <img
                          src={
                            item.product.image_url
                          }
                          alt={
                            item.product.name
                          }
                        />

                      ) : (

                        <span>
                          📦
                        </span>

                      )}

                    </div>

                    <div className="pos-cart-item-info">

                      <strong>
                        {item.product.name}
                      </strong>

                      {item.variant_label ? (
                        <small>{item.variant_label}</small>
                      ) : null}

                      <small>
                        {formatCurrency(
                          item.price
                        )}{' '}
                        each
                      </small>

                      {/* QUANTITY */}

                      <div className="pos-quantity-controls">

                        <button
                          type="button"
                          disabled={
                            checkingOut
                          }
                          onClick={() =>
                            changeQuantity(
                              item.lineId,
                              item.quantity - 1
                            )
                          }
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={
                            item.product
                              .stock_quantity
                          }
                          value={
                            item.quantity
                          }
                          disabled={
                            checkingOut
                          }
                          onChange={(event) =>
                            changeQuantity(
                              item.lineId,
                              event.target.value
                            )
                          }
                        />

                        <button
                          type="button"
                          disabled={
                            checkingOut ||
                            item.quantity >=
                              Number(
                                item.product
                                  .stock_quantity ||
                                  0
                              )
                          }
                          onClick={() =>
                            changeQuantity(
                              item.lineId,
                              item.quantity + 1
                            )
                          }
                        >
                          +
                        </button>

                      </div>

                      {/* DISCOUNT */}

                      <div className="pos-line-discount">

                        <label>
                          Discount %
                        </label>

                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            item.discountPercent
                          }
                          disabled={
                            checkingOut
                          }
                          onChange={(event) =>
                            changeDiscount(
                              item.lineId,
                              event.target.value
                            )
                          }
                        />

                      </div>

                    </div>

                    <div className="pos-cart-item-total">

                      <strong>
                        {formatCurrency(
                          item.lineTotal
                        )}
                      </strong>

                      {item.lineDiscount > 0 && (
                        <small className="pos-discount-text">
                          -
                          {formatCurrency(
                            item.lineDiscount
                          )}
                        </small>
                      )}

                      <button
                        type="button"
                        disabled={
                          checkingOut
                        }
                        onClick={() =>
                          removeFromCart(
                            item.lineId
                          )
                        }
                      >
                        Remove
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

          {/* =================================================
              CHECKOUT FORM
          ================================================= */}

          {cart.length > 0 && (

            <form
              className="pos-checkout-form"
              onSubmit={
                handleCheckout
              }
            >

              {/* CUSTOMER */}

              <div className="pos-form-section">

                <h3>
                  Customer
                </h3>

                <div className="pos-form-grid">

                  <input
                    type="text"
                    placeholder="First name"
                    value={
                      customer.first_name
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        first_name:
                          event.target.value,
                      })
                    }
                  />

                  <input
                    type="text"
                    placeholder="Last name"
                    value={
                      customer.last_name
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        last_name:
                          event.target.value,
                      })
                    }
                  />

                  <input
                    type="tel"
                    placeholder="Phone"
                    value={
                      customer.phone
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        phone:
                          event.target.value,
                      })
                    }
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    value={
                      customer.email
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        email:
                          event.target.value,
                      })
                    }
                  />

                </div>

              </div>

              {/* PAYMENT */}

              <div className="pos-form-section">

                <h3>
                  Payment
                </h3>

                <div className="pos-form-grid">

                  <select
                    value={
                      paymentMethod
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) => {

                      const method =
                        event.target.value;

                      setPaymentMethod(
                        method
                      );

                      if (
                        method !== 'cash'
                      ) {
                        setCashTendered(
                          ''
                        );
                      }

                    }}
                  >

                    <option value="cash">
                      Cash
                    </option>

                    <option value="mpesa">
                      M-Pesa
                    </option>

                    <option value="card">
                      Card
                    </option>

                    <option value="bank">
                      Bank Transfer
                    </option>

                  </select>

                  <input
                    type="text"
                    placeholder={
                      paymentMethod === 'mpesa'
                        ? 'M-Pesa confirmation code'
                        : 'Transaction ID (optional)'
                    }
                    value={
                      transactionId
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setTransactionId(
                        event.target.value
                      )
                    }
                  />

                </div>

                {/* CASH */}

                {paymentMethod ===
                  'cash' && (

                  <div className="pos-cash-section">

                    <label>
                      Cash Tendered
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter amount received"
                      value={
                        cashTendered
                      }
                      disabled={
                        checkingOut
                      }
                      onChange={(event) =>
                        setCashTendered(
                          event.target.value
                        )
                      }
                    />

                    <div className="pos-cash-summary">

                      <div>

                        <span>
                          Amount Due
                        </span>

                        <strong>
                          {formatCurrency(
                            total
                          )}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Cash Received
                        </span>

                        <strong>
                          {formatCurrency(
                            numericCashTendered
                          )}
                        </strong>

                      </div>

                      <div
                        className={
                          cashIsInsufficient
                            ? 'cash-short'
                            : 'cash-change'
                        }
                      >

                        <span>
                          {cashIsInsufficient
                            ? 'Amount Short'
                            : 'Change Due'}
                        </span>

                        <strong>
                          {cashIsInsufficient
                            ? formatCurrency(
                                total -
                                  numericCashTendered
                              )
                            : formatCurrency(
                                changeDue
                              )}
                        </strong>

                      </div>

                    </div>

                  </div>

                )}

              </div>

              {/* DELIVERY */}

              <div className="pos-form-section">

                <h3>
                  Delivery
                </h3>

                <div className="pos-form-grid">

                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setCity(
                        event.target.value
                      )
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Delivery fee"
                    value={
                      deliveryFee
                    }
                    disabled={
                      checkingOut
                    }
                    onChange={(event) =>
                      setDeliveryFee(
                        event.target.value
                      )
                    }
                  />

                </div>

                <textarea
                  placeholder="Delivery address (optional)"
                  value={
                    deliveryAddress
                  }
                  disabled={
                    checkingOut
                  }
                  onChange={(event) =>
                    setDeliveryAddress(
                      event.target.value
                    )
                  }
                  rows="2"
                />

              </div>

              {/* NOTES */}

              <div className="pos-form-section">

                <h3>
                  Notes
                </h3>

                <textarea
                  placeholder="Order notes..."
                  value={notes}
                  disabled={
                    checkingOut
                  }
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows="2"
                />

              </div>

              {/* =================================================
                  TOTALS
              ================================================= */}

              <div className="pos-totals">

                <div>

                  <span>
                    Gross Subtotal
                  </span>

                  <strong>
                    {formatCurrency(
                      grossSubtotal
                    )}
                  </strong>

                </div>

                <div className="pos-discount-total">

                  <span>
                    Total Discount
                  </span>

                  <strong>
                    -
                    {formatCurrency(
                      totalDiscount
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Subtotal After Discount
                  </span>

                  <strong>
                    {formatCurrency(
                      finalSubtotal
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Delivery
                  </span>

                  <strong>
                    {formatCurrency(
                      numericDeliveryFee
                    )}
                  </strong>

                </div>

                <div className="pos-grand-total">

                  <span>
                    Total
                  </span>

                  <strong>
                    {formatCurrency(
                      total
                    )}
                  </strong>

                </div>

              </div>

              {/* =================================================
                  CHECKOUT BUTTON
              ================================================= */}

              <button
                type="submit"
                className="pos-checkout-button"
                disabled={
                  checkingOut ||
                  cart.length === 0 ||
                  cashIsInsufficient
                }
              >

                {checkingOut
                  ? 'Processing Sale...'
                  : cashIsInsufficient
                    ? 'Insufficient Cash'
                    : `Complete Sale • ${formatCurrency(
                        total
                      )}`}

              </button>

            </form>

          )}

        </section>

      </div>

      {variantPickerProduct && (
        <div
          className="pos-receipt-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setVariantPickerProduct(null);
            }
          }}
        >
          <div className="pos-receipt-modal pos-variant-picker">
            <div className="pos-receipt-actions">
              <button
                type="button"
                className="pos-close-receipt"
                onClick={() => setVariantPickerProduct(null)}
              >
                Close
              </button>
            </div>

            <h3>{variantPickerProduct.name}</h3>
            <p>
              Choose the{' '}
              {selectableVariants(variantPickerProduct)[0]?.option_type === 'size'
                ? 'size'
                : 'colour'}{' '}
              that is in stock.
            </p>

            <div className="pos-variant-options">
              {selectableVariants(variantPickerProduct).map((variant) => {
                const stock = Number(variant.stock_quantity || 0);
                const label = variantDisplayLabel(variant);
                const price =
                  variant.price == null || variant.price === ''
                    ? Number(variantPickerProduct.price || 0)
                    : Number(variant.price);

                return (
                  <button
                    type="button"
                    key={variant.id}
                    className="pos-variant-option"
                    disabled={stock <= 0}
                    onClick={() => addToCart(variantPickerProduct, variant)}
                  >
                    <strong>{label}</strong>
                    <span>{formatCurrency(price)}</span>
                    <small>
                      {stock <= 0 ? 'Out of stock' : `${stock} in stock`}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          RECEIPT MODAL
      ===================================================== */}

      {receiptData && (

        <div className="pos-receipt-overlay">

          <div className="pos-receipt-modal">

            <div className="pos-receipt-actions">

              <button
                type="button"
                onClick={
                  printReceipt
                }
                className="pos-print-button"
              >
                🖨 Print Receipt
              </button>

              <button
                type="button"
                onClick={
                  closeReceipt
                }
                className="pos-close-receipt"
              >
                Close
              </button>

            </div>

            <div
              className="pos-receipt"
              id="printable-receipt"
            >

              {/* RECEIPT HEADER */}

              <div className="receipt-header">

                <h2>
                  SLEEK SISTERS
                </h2>

                <p>
                  Point of Sale Receipt
                </p>

                <p>
                  Order #
                  {
                    receiptData.orderId
                  }
                </p>

                <p>
                  {
                    receiptData.date
                  }
                </p>

              </div>

              <div className="receipt-divider" />

              {/* CUSTOMER */}

              {(
                receiptData.customer
                  .first_name ||
                receiptData.customer
                  .last_name ||
                receiptData.customer
                  .phone
              ) ? (

                <div className="receipt-customer">

                  <strong>
                    Customer
                  </strong>

                  {(
                    receiptData.customer
                      .first_name ||
                    receiptData.customer
                      .last_name
                  ) && (

                    <p>
                      {
                        receiptData
                          .customer
                          .first_name
                      }{' '}
                      {
                        receiptData
                          .customer
                          .last_name
                      }
                    </p>

                  )}

                  {receiptData.customer
                    .phone && (

                    <p>
                      {
                        receiptData
                          .customer
                          .phone
                      }
                    </p>

                  )}

                  {receiptData.city && (

                    <p>
                      City:{' '}
                      {
                        receiptData.city
                      }
                    </p>

                  )}

                </div>

              ) : null}

              <div className="receipt-divider" />

              {/* ITEMS */}

              <div className="receipt-items">

                {receiptData.items.map(
                  (item, index) => (

                    <div
                      className="receipt-item"
                      key={index}
                    >

                      <div>

                        <strong>
                          {item.name}
                        </strong>

                        <p>
                          {item.quantity} ×{' '}
                          {formatCurrency(
                            item.price
                          )}
                        </p>

                        {item.discountPercent >
                          0 && (

                          <small>
                            {
                              item.discountPercent
                            }%
                            discount
                          </small>

                        )}

                      </div>

                      <strong>
                        {formatCurrency(
                          item.lineTotal
                        )}
                      </strong>

                    </div>

                  )
                )}

              </div>

              <div className="receipt-divider" />

              {/* TOTALS */}

              <div className="receipt-totals">

                <div>

                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {formatCurrency(
                      receiptData.grossSubtotal
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Discount
                  </span>

                  <strong>
                    -
                    {formatCurrency(
                      receiptData.totalDiscount
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Delivery
                  </span>

                  <strong>
                    {formatCurrency(
                      receiptData.deliveryFee
                    )}
                  </strong>

                </div>

                <div className="receipt-total">

                  <span>
                    TOTAL
                  </span>

                  <strong>
                    {formatCurrency(
                      receiptData.total
                    )}
                  </strong>

                </div>

              </div>

              <div className="receipt-divider" />

              {/* PAYMENT */}

              <div className="receipt-payment">

                <p>

                  <strong>
                    Payment:
                  </strong>{' '}

                  {
                    receiptData
                      .paymentMethod
                      .toUpperCase()
                  }

                </p>

                {receiptData.transactionId && (

                  <p>

                    <strong>
                      Transaction:
                    </strong>{' '}

                    {
                      receiptData
                        .transactionId
                    }

                  </p>

                )}

                {receiptData.paymentMethod ===
                  'cash' && (

                  <>

                    <p>

                      <strong>
                        Cash Received:
                      </strong>{' '}

                      {formatCurrency(
                        receiptData.cashTendered
                      )}

                    </p>

                    <p>

                      <strong>
                        Change:
                      </strong>{' '}

                      {formatCurrency(
                        receiptData.changeDue
                      )}

                    </p>

                  </>

                )}

              </div>

              {/* FOOTER */}

              <div className="receipt-footer">

                <p>
                  Thank you for shopping
                  with Sleek Sisters.
                </p>

                <p>
                  Please keep this receipt
                  for your records.
                </p>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default POS;