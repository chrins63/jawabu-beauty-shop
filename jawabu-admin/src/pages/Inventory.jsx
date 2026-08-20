import { useEffect, useState } from 'react';
import {
  Package,
  BarChart3,
  AlertTriangle,
  XCircle,
  Wallet,
  PackageSearch,
  ClipboardList,
  RefreshCw,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './inventory.css';

function Inventory() {
  const { user } = useAuth();

  // =========================================================
  // INVENTORY STATE
  // =========================================================

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // =========================================================
  // MOVEMENT HISTORY STATE
  // =========================================================

  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementError, setMovementError] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');

  // =========================================================
  // ADJUSTMENT STATE
  // =========================================================

  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState('');

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchInventory();
    fetchMovements();
  }, []);

  // =========================================================
  // FETCH INVENTORY
  // =========================================================

  const fetchInventory = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          barcode,
          price,
          cost_price,
          stock_quantity,
          low_stock_threshold,
          image_url,
          updated_at
        `)
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError(err.message || 'Unable to load inventory.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH MOVEMENT HISTORY
  //
  // IMPORTANT:
  // We DO NOT query staff_profiles as a nested Supabase
  // relationship because there is currently no foreign key
  // relationship in the database.
  // =========================================================

  const fetchMovements = async () => {
    setMovementsLoading(true);
    setMovementError('');

    try {
      // 1. Get inventory movements
      const { data: movementData, error: movementQueryError } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          product_id,
          quantity,
          movement_type,
          reference_type,
          reference_id,
          notes,
          created_by,
          created_at,
          products (
            name,
            sku
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (movementQueryError) throw movementQueryError;

      const movementsData = movementData || [];

      // 2. Collect staff UUIDs
      const staffIds = [
        ...new Set(
          movementsData.map((movement) => movement.created_by).filter(Boolean)
        ),
      ];

      // 3. Fetch staff separately
      let staffProfiles = [];

      if (staffIds.length > 0) {
        const { data: staffData, error: staffQueryError } = await supabase
          .from('staff_profiles')
          .select(`
            id,
            first_name,
            last_name,
            role
          `)
          .in('id', staffIds);

        if (staffQueryError) {
          console.error('Error loading staff profiles:', staffQueryError);
        } else {
          staffProfiles = staffData || [];
        }
      }

      // 4. Combine movement + staff data
      const movementsWithStaff = movementsData.map((movement) => {
        const staff = staffProfiles.find(
          (profile) => profile.id === movement.created_by
        );

        return {
          ...movement,
          staff_profiles: staff || null,
        };
      });

      setMovements(movementsWithStaff);
    } catch (err) {
      console.error('Error loading inventory history:', err);
      setMovements([]);
      setMovementError(
        err.message || 'Unable to load inventory movement history.'
      );
    } finally {
      setMovementsLoading(false);
    }
  };

  // =========================================================
  // REFRESH EVERYTHING
  // =========================================================

  const refreshInventory = async () => {
    await Promise.all([fetchInventory(), fetchMovements()]);
  };

  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    return `KSh ${Number(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================================
  // STOCK STATUS
  // =========================================================

  const getStockStatus = (product) => {
    const stock = Number(product.stock_quantity || 0);
    const threshold = Number(product.low_stock_threshold || 0);

    if (stock <= 0) {
      return { label: 'Out of stock', className: 'inventory-status out' };
    }

    if (stock <= threshold) {
      return { label: 'Low stock', className: 'inventory-status low' };
    }

    return { label: 'In stock', className: 'inventory-status good' };
  };

  // =========================================================
  // SEARCH PRODUCTS
  // =========================================================

  const filteredProducts = products.filter((product) => {
    const text = search.toLowerCase().trim();

    if (!text) return true;

    return (
      (product.name || '').toLowerCase().includes(text) ||
      (product.sku || '').toLowerCase().includes(text) ||
      (product.barcode || '').toLowerCase().includes(text)
    );
  });

  // =========================================================
  // SUMMARY CALCULATIONS
  // =========================================================

  const totalUnits = products.reduce(
    (total, product) => total + Number(product.stock_quantity || 0),
    0
  );

  const lowStockCount = products.filter((product) => {
    const stock = Number(product.stock_quantity || 0);
    const threshold = Number(product.low_stock_threshold || 0);
    return stock > 0 && stock <= threshold;
  }).length;

  const outOfStockCount = products.filter(
    (product) => Number(product.stock_quantity || 0) <= 0
  ).length;

  const inventoryValue = products.reduce(
    (total, product) =>
      total + Number(product.cost_price || 0) * Number(product.stock_quantity || 0),
    0
  );

  // =========================================================
  // OPEN / CLOSE ADJUSTMENT
  // =========================================================

  const openAdjustment = (product) => {
    setSelectedProduct(product);
    setAdjustmentType('IN');
    setQuantity('');
    setNotes('');
    setAdjustmentError('');
    setShowAdjustment(true);
  };

  const closeAdjustment = () => {
    if (adjusting) return;

    setShowAdjustment(false);
    setSelectedProduct(null);
    setQuantity('');
    setNotes('');
    setAdjustmentError('');
  };

  // =========================================================
  // SAVE ADJUSTMENT
  // =========================================================

  const handleAdjustment = async (event) => {
    event.preventDefault();

    if (!selectedProduct) {
      setAdjustmentError('No product has been selected.');
      return;
    }

    if (!user?.id) {
      setAdjustmentError('Your session has expired. Please log in again.');
      return;
    }

    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      setAdjustmentError('Quantity must be a whole number greater than zero.');
      return;
    }

    const currentStock = Number(selectedProduct.stock_quantity || 0);

    if (adjustmentType === 'OUT' && amount > currentStock) {
      setAdjustmentError(
        `Cannot remove ${amount} units. ${selectedProduct.name} only has ${currentStock} units.`
      );
      return;
    }

    const newStock =
      adjustmentType === 'IN' ? currentStock + amount : currentStock - amount;

    setAdjusting(true);
    setAdjustmentError('');

    try {
      // 1. Record movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: selectedProduct.id,
          quantity: amount,
          movement_type: 'adjustment',
          reference_type: 'MANUAL_ADJUSTMENT',
          reference_id: null,
          notes: notes.trim() || null,
          created_by: user.id,
        });

      if (movementError) {
        console.error('Inventory movement error:', movementError);
        throw new Error(
          `Unable to record inventory movement: ${movementError.message}`
        );
      }

      // 2. Update product stock
      const { error: productError } = await supabase
        .from('products')
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProduct.id);

      if (productError) {
        console.error('Product update error:', productError);
        throw new Error(
          `Movement was recorded but product stock could not be updated: ${productError.message}`
        );
      }

      // 3. Update local product state
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                stock_quantity: newStock,
                updated_at: new Date().toISOString(),
              }
            : product
        )
      );

      // 4. Refresh movement history
      await fetchMovements();

      // 5. Close modal
      setShowAdjustment(false);
      setSelectedProduct(null);
      setQuantity('');
      setNotes('');
      setAdjustmentError('');
    } catch (err) {
      console.error('Adjustment failed:', err);
      setAdjustmentError(err.message || 'Unable to save stock adjustment.');
    } finally {
      setAdjusting(false);
    }
  };

  // =========================================================
  // MOVEMENT LABEL / CLASS / QUANTITY
  // =========================================================

  const getMovementLabel = (type) => {
    switch (type) {
      case 'stock_received':
        return 'Stock Received';
      case 'sale':
        return 'Sale';
      case 'return':
        return 'Return';
      case 'adjustment':
        return 'Adjustment';
      case 'damage':
        return 'Damage';
      case 'loss':
        return 'Loss';
      default:
        return type || 'Unknown';
    }
  };

  const getMovementClass = (type) => {
    switch (type) {
      case 'stock_received':
      case 'return':
        return 'movement-positive';
      case 'sale':
      case 'damage':
      case 'loss':
        return 'movement-negative';
      case 'adjustment':
        return 'movement-adjustment';
      default:
        return '';
    }
  };

  const getMovementQuantity = (movement) => {
    const amount = Number(movement.quantity || 0);

    switch (movement.movement_type) {
      case 'stock_received':
      case 'return':
        return `+${amount}`;
      case 'sale':
      case 'damage':
      case 'loss':
        return `-${amount}`;
      case 'adjustment':
        return amount;
      default:
        return amount;
    }
  };

  // =========================================================
  // FILTER MOVEMENTS
  // =========================================================

  const filteredMovements =
    movementFilter === 'all'
      ? movements
      : movements.filter((movement) => movement.movement_type === movementFilter);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="inventory-page">
      {/* HEADER */}
      <div className="inventory-header">
        <div>
          <h1>Inventory</h1>
          <p>Monitor and manage Jawabu Beauty stock.</p>
        </div>

        <button
          type="button"
          className="inventory-refresh-button"
          onClick={refreshInventory}
          disabled={loading || movementsLoading}
        >
          <RefreshCw
            size={15}
            className={loading || movementsLoading ? 'is-spinning' : ''}
          />
          Refresh
        </button>
      </div>

      {/* SUMMARY */}
      <div className="inventory-summary">
        <div className="inventory-summary-card">
          <div className="inventory-summary-icon">
            <Package size={20} />
          </div>
          <div>
            <span>Total Products</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon">
            <BarChart3 size={20} />
          </div>
          <div>
            <span>Total Units</span>
            <strong>{totalUnits.toLocaleString()}</strong>
          </div>
        </div>

        <div className="inventory-summary-card warning">
          <div className="inventory-summary-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>Low Stock</span>
            <strong>{lowStockCount}</strong>
          </div>
        </div>

        <div className="inventory-summary-card danger">
          <div className="inventory-summary-icon">
            <XCircle size={20} />
          </div>
          <div>
            <span>Out of Stock</span>
            <strong>{outOfStockCount}</strong>
          </div>
        </div>

        <div className="inventory-summary-card value">
          <div className="inventory-summary-icon">
            <Wallet size={20} />
          </div>
          <div>
            <span>Inventory Cost Value</span>
            <strong>{formatCurrency(inventoryValue)}</strong>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="inventory-error">
          <strong>Unable to load inventory</strong>
          <p>{error}</p>
        </div>
      )}

      {/* STOCK OVERVIEW */}
      <div className="inventory-card">
        <div className="inventory-card-header">
          <div>
            <h2>Stock Overview</h2>
            <p>
              {filteredProducts.length} product
              {filteredProducts.length === 1 ? '' : 's'}
            </p>
          </div>

          <input
            className="inventory-search"
            type="text"
            placeholder="Search product, SKU or barcode..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="inventory-empty">Loading inventory…</div>
        ) : filteredProducts.length === 0 ? (
          <div className="inventory-empty">
            <div className="inventory-empty-icon">
              <PackageSearch size={40} />
            </div>
            <h3>No inventory found</h3>
            <p>
              {products.length === 0
                ? 'There are currently no active products.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Low Stock At</th>
                  <th>Cost Price</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const stock = Number(product.stock_quantity || 0);
                  const stockValue = Number(product.cost_price || 0) * stock;

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="inventory-product">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="inventory-product-image"
                            />
                          ) : (
                            <div className="inventory-product-placeholder">
                              <Package size={18} />
                            </div>
                          )}

                          <div>
                            <strong>{product.name}</strong>
                            {product.barcode && <small>{product.barcode}</small>}
                          </div>
                        </div>
                      </td>

                      <td>{product.sku || '—'}</td>

                      <td>
                        <strong className="inventory-stock-number">{stock}</strong>
                      </td>

                      <td>{product.low_stock_threshold ?? 0}</td>

                      <td>{formatCurrency(product.cost_price)}</td>

                      <td>
                        <strong>{formatCurrency(stockValue)}</strong>
                      </td>

                      <td>
                        <span className={status.className}>{status.label}</span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="inventory-adjust-button"
                          onClick={() => openAdjustment(product)}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MOVEMENT HISTORY */}
      <div className="inventory-history-card">
        <div className="inventory-history-header">
          <div>
            <h2>Inventory Movement History</h2>
            <p>Recent stock movements and inventory activity.</p>
          </div>

          <div className="inventory-history-controls">
            <select
              value={movementFilter}
              onChange={(event) => setMovementFilter(event.target.value)}
              className="inventory-history-filter"
            >
              <option value="all">All Movements</option>
              <option value="stock_received">Stock Received</option>
              <option value="sale">Sales</option>
              <option value="return">Returns</option>
              <option value="adjustment">Adjustments</option>
              <option value="damage">Damage</option>
              <option value="loss">Loss</option>
            </select>

            <button
              type="button"
              className="inventory-history-refresh"
              onClick={fetchMovements}
              disabled={movementsLoading}
            >
              <RefreshCw size={16} className={movementsLoading ? 'is-spinning' : ''} />
            </button>
          </div>
        </div>

        {movementError && (
          <div className="inventory-error">
            <strong>Unable to load movement history</strong>
            <p>{movementError}</p>
          </div>
        )}

        {movementsLoading ? (
          <div className="inventory-history-empty">
            <div className="inventory-empty-icon">
              <ClipboardList size={40} />
            </div>
            <p>Loading movement history…</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="inventory-history-empty">
            <div className="inventory-empty-icon">
              <ClipboardList size={40} />
            </div>
            <h3>No inventory movements</h3>
            <p>Stock activity will appear here.</p>
          </div>
        ) : (
          <div className="inventory-history-table-wrapper">
            <table className="inventory-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Staff</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {filteredMovements.map((movement) => {
                  const staff = movement.staff_profiles;
                  const product = movement.products;

                  const staffName = staff
                    ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                    : 'Unknown staff';

                  const movementClass = getMovementClass(movement.movement_type);

                  return (
                    <tr key={movement.id}>
                      <td>
                        <div className="movement-date">
                          <strong>
                            {new Date(movement.created_at).toLocaleDateString(
                              'en-KE',
                              { day: '2-digit', month: 'short', year: 'numeric' }
                            )}
                          </strong>
                          <small>
                            {new Date(movement.created_at).toLocaleTimeString(
                              'en-KE',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="movement-product">
                          <strong>{product?.name || 'Unknown product'}</strong>
                          {product?.sku && <small>{product.sku}</small>}
                        </div>
                      </td>

                      <td>
                        <span className={`movement-type ${movementClass}`}>
                          {getMovementLabel(movement.movement_type)}
                        </span>
                      </td>

                      <td>
                        <strong className={`movement-quantity ${movementClass}`}>
                          {getMovementQuantity(movement)}
                        </strong>
                      </td>

                      <td>
                        <div className="movement-staff">
                          <strong>{staffName}</strong>
                          {staff?.role && <small>{staff.role}</small>}
                        </div>
                      </td>

                      <td>
                        <span className="movement-notes">{movement.notes || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADJUSTMENT MODAL */}
      {showAdjustment && selectedProduct && (
        <div
          className="inventory-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !adjusting) {
              closeAdjustment();
            }
          }}
        >
          <div className="inventory-modal">
            <div className="inventory-modal-header">
              <div>
                <h2>Adjust Stock</h2>
                <p>{selectedProduct.name}</p>
              </div>

              <button
                type="button"
                className="inventory-modal-close"
                onClick={closeAdjustment}
                disabled={adjusting}
              >
                <X size={18} />
              </button>
            </div>

            <form className="inventory-adjustment-form" onSubmit={handleAdjustment}>
              <div className="inventory-current-stock">
                <span>Current Stock</span>
                <strong>{selectedProduct.stock_quantity ?? 0}</strong>
              </div>

              <div className="inventory-form-group">
                <label>Adjustment Type</label>
                <select
                  value={adjustmentType}
                  onChange={(event) => setAdjustmentType(event.target.value)}
                  disabled={adjusting}
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                </select>
              </div>

              <div className="inventory-form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Enter quantity"
                  disabled={adjusting}
                  required
                />
              </div>

              <div className="inventory-form-group">
                <label>Reason / Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g. New delivery, stock count adjustment, damaged item..."
                  rows="4"
                  disabled={adjusting}
                />
              </div>

              {adjustmentError && (
                <div className="inventory-adjustment-error">{adjustmentError}</div>
              )}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel-button"
                  onClick={closeAdjustment}
                  disabled={adjusting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inventory-save-button"
                  disabled={adjusting}
                >
                  {adjusting ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;