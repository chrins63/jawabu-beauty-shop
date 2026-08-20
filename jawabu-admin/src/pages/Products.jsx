import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './products.css';

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
const handleArchiveProduct = async (product) => {
  const confirmed = window.confirm(
    `Are you sure you want to archive "${product.name}"?\n\n` +
    `The product will disappear from the active catalogue, ` +
    `but its historical records will remain safe.`
  );

  if (!confirmed) {
    return;
  }

  setError('');

  const { error } = await supabase
    .from('products')
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', product.id);

  if (error) {
    console.error(
      'Error archiving product:',
      error
    );

    setError(
      `Unable to archive product: ${error.message}`
    );

    return;
  }

  setProducts((currentProducts) =>
    currentProducts.filter(
      (item) => item.id !== product.id
    )
  );
};
  useEffect(() => {
    fetchProducts();
  }, []);

  /*
   * ==========================================
   * FETCH PRODUCTS
   * ==========================================
   */

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('active', true)
  .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products:', error);
      setError(error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  /*
   * ==========================================
   * SEARCH / FILTER
   * ==========================================
   */

  const filteredProducts = products.filter((product) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return true;
    }

    return (
      (product.name || '')
        .toLowerCase()
        .includes(searchText) ||

      (product.sku || '')
        .toLowerCase()
        .includes(searchText) ||

      (product.barcode || '')
        .toLowerCase()
        .includes(searchText)
    );
  });

  /*
   * ==========================================
   * CURRENCY
   * ==========================================
   */

  const formatCurrency = (amount) => {
    return `KSh ${Number(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  /*
   * ==========================================
   * STOCK STATUS
   * ==========================================
   */

  const getStockStatus = (product) => {
    const stock = Number(product.stock_quantity || 0);
    const threshold = Number(
      product.low_stock_threshold || 0
    );

    if (stock <= 0) {
      return {
        label: 'Out of stock',
        className: 'stock-status out',
      };
    }

    if (stock <= threshold) {
      return {
        label: 'Low stock',
        className: 'stock-status low',
      };
    }

    return {
      label: 'In stock',
      className: 'stock-status good',
    };
  };

  /*
   * ==========================================
   * VIEW PRODUCT
   * ==========================================
   */

  const handleViewProduct = (product) => {
    alert(
      `Product: ${product.name}\nProduct ID: ${product.id}`
    );
  };

  /*
   * ==========================================
   * EDIT PRODUCT
   * ==========================================
   */

  const handleEditProduct = (product) => {
    navigate(`/products/${product.id}/edit`);
  };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <div className="products-page">

      {/* =====================================
          PAGE HEADER
          ===================================== */}

      <div className="products-header">

        <div>
          <h1>Products</h1>

          <p>
            Manage the Jawabu Beauty product catalogue.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchProducts}
          disabled={loading}
        >
          ↻ Refresh
        </button>

      </div>


      {/* =====================================
          SEARCH
          ===================================== */}

      <div className="products-toolbar">

        <input
          type="text"
          placeholder="Search by product name, SKU or barcode..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

      </div>


      {/* =====================================
          ERROR
          ===================================== */}

      {error && (
        <div className="products-error">

          <strong>
            Unable to load products
          </strong>

          <p>
            {error}
          </p>

        </div>
      )}


      {/* =====================================
          PRODUCTS CARD
          ===================================== */}

      <div className="products-card">

        {/* CARD HEADER */}

        <div className="products-card-header">

          <div>

            <h2>
              Product Catalogue
            </h2>

            <p>
              {filteredProducts.length} product
              {filteredProducts.length === 1
                ? ''
                : 's'}
            </p>

          </div>


          {/* ADD PRODUCT */}

          <button
            className="add-product-button"
            onClick={() =>
              navigate('/products/new')
            }
          >
            + Add Product
          </button>

        </div>


        {/* =================================
            LOADING
            ================================= */}

        {loading ? (

          <div className="products-empty">

            <div className="loading-spinner">
              Loading products...
            </div>

          </div>

        ) : filteredProducts.length === 0 ? (

          /* =================================
             EMPTY
             ================================= */

          <div className="products-empty">

            <div className="empty-icon">
              📦
            </div>

            <h3>
              No products found
            </h3>

            <p>
              {products.length === 0
                ? 'There are currently no products in your catalogue.'
                : 'Try changing your search.'}
            </p>

            {products.length === 0 && (
              <button
                className="add-product-button"
                onClick={() =>
                  navigate('/products/new')
                }
              >
                + Add Your First Product
              </button>
            )}

          </div>

        ) : (

          /* =================================
             PRODUCTS TABLE
             ================================= */

          <div className="products-table-wrapper">

            <table className="products-table">

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Cost Price
                  </th>

                  <th>
                    Selling Price
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredProducts.map((product) => {

                  const stockStatus =
                    getStockStatus(product);

                  return (

                    <tr key={product.id}>

                      {/* =========================
                          PRODUCT
                          ========================= */}

                      <td>

                        <div className="product-cell">

                          {product.image_url ? (

                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="product-image"
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  'none';

                                event.currentTarget.nextElementSibling.style.display =
                                  'flex';
                              }}
                            />

                          ) : null}


                          <div
                            className="product-image-placeholder"
                            style={{
                              display: product.image_url
                                ? 'none'
                                : 'flex',
                            }}
                          >
                            📦
                          </div>


                          <div>

                            <strong>
                              {product.name}
                            </strong>

                            {product.description && (

                              <small>

                                {product.description.length >
                                60
                                  ? `${product.description.slice(
                                      0,
                                      60
                                    )}...`
                                  : product.description}

                              </small>

                            )}

                          </div>

                        </div>

                      </td>


                      {/* =========================
                          SKU
                          ========================= */}

                      <td>
                        {product.sku || '—'}
                      </td>


                      {/* =========================
                          CATEGORY
                          ========================= */}

                      <td>
                        {product.category_id || '—'}
                      </td>


                      {/* =========================
                          COST PRICE
                          ========================= */}

                      <td>
                        {formatCurrency(
                          product.cost_price
                        )}
                      </td>


                      {/* =========================
                          SELLING PRICE
                          ========================= */}

                      <td>

                        <strong>
                          {formatCurrency(
                            product.price
                          )}
                        </strong>

                      </td>


                      {/* =========================
                          STOCK
                          ========================= */}

                      <td>

                        <strong>
                          {product.stock_quantity ?? 0}
                        </strong>

                      </td>


                      {/* =========================
                          STATUS
                          ========================= */}

                      <td>

                        <span
                          className={
                            stockStatus.className
                          }
                        >
                          {stockStatus.label}
                        </span>

                      </td>


                      {/* =========================
                          ACTIONS
                          ========================= */}

                      <td>

                       <div className="product-actions">

  <button
    className="view-button"
    onClick={() =>
      handleViewProduct(product)
    }
  >
    View
  </button>

  <button
    className="edit-button"
    onClick={() =>
      handleEditProduct(product)
    }
  >
    Edit
  </button>

  <button
    className="delete-button"
    onClick={() =>
      handleArchiveProduct(product)
    }
  >
    Archive
  </button>

</div>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Products;