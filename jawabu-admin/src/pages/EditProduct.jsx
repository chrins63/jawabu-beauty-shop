import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ProductOptionsEditor from '../components/ProductOptionsEditor';
import {
  emptyOptionRow,
  rowsFromVariants,
  saveProductOptions,
} from '../lib/productOptions';
import './AddProduct.css';

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    low_stock_threshold: '5',
    sku: '',
    barcode: '',
    category_id: '',
    category_name: '',
    image_url: '',
  });

  const [optionType, setOptionType] = useState('');
  const [optionRows, setOptionRows] = useState([emptyOptionRow()]);

  /*
   * ==========================================
   * LOAD PRODUCT
   * ==========================================
   */

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading product:', error);
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('sort_order', { ascending: true });

    if (variantError) {
      console.error('Error loading product options:', variantError);
      setError(variantError.message);
      setLoading(false);
      return;
    }

    setOptionType(variants?.[0]?.option_type || '');
    setOptionRows(rowsFromVariants(variants || []));

    setForm({
      name: data.name || '',
      description: data.description || '',
      price: data.price ?? '',
      cost_price: data.cost_price ?? '',
      stock_quantity: data.stock_quantity ?? '',
      low_stock_threshold: data.low_stock_threshold ?? 5,
      sku: data.sku || '',
      barcode: data.barcode || '',
      category_id: data.category_id ?? '',
      category_name: data.category || '',
      image_url: data.image_url || '',
    });

    setLoading(false);
  };

  /*
   * ==========================================
   * LOAD CATEGORIES
   * ==========================================
   */

  const fetchCategories = async () => {
    setLoadingCategories(true);

    const { data, error } = await supabase
      .from('category')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading categories:', error);
      setError(`Unable to load categories: ${error.message}`);
    } else {
      setCategories(data || []);
    }

    setLoadingCategories(false);
  };

  /*
   * ==========================================
   * HANDLE INPUT
   * ==========================================
   */

  useEffect(() => {
    if (form.category_id || !form.category_name || categories.length === 0) {
      return;
    }

    const match = categories.find(
      (item) => item.name === form.category_name
    );

    if (match) {
      setForm((current) => ({
        ...current,
        category_id: match.id,
      }));
    }
  }, [categories, form.category_id, form.category_name]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  /*
   * ==========================================
   * UPDATE PRODUCT
   * ==========================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    /*
     * BASIC VALIDATION
     */

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (form.price === '' || Number(form.price) < 0) {
      setError('Please enter a valid selling price.');
      return;
    }

    if (
      form.cost_price !== '' &&
      Number(form.cost_price) < 0
    ) {
      setError('Cost price cannot be negative.');
      return;
    }

    if (
      form.stock_quantity !== '' &&
      Number(form.stock_quantity) < 0
    ) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    if (
      form.low_stock_threshold !== '' &&
      Number(form.low_stock_threshold) < 0
    ) {
      setError('Low stock threshold cannot be negative.');
      return;
    }

    if (
      optionType &&
      !optionRows.some((row) => String(row.option_value || '').trim())
    ) {
      setError('Add at least one colour or size, or turn options off.');
      return;
    }

    setSaving(true);

    const productData = {
      name: form.name.trim(),

      description:
        form.description.trim() || null,

      price: Number(form.price),

      cost_price:
        form.cost_price === ''
          ? 0
          : Number(form.cost_price),

      stock_quantity:
        form.stock_quantity === ''
          ? 0
          : Number(form.stock_quantity),

      low_stock_threshold:
        form.low_stock_threshold === ''
          ? 5
          : Number(form.low_stock_threshold),

      sku:
        form.sku.trim() || null,

      barcode:
        form.barcode.trim() || null,

      category_id:
        form.category_id === ''
          ? null
          : Number(form.category_id),

      category:
        categories.find(
          (item) => String(item.id) === String(form.category_id)
        )?.name || form.category_name || null,

      image_url:
        form.image_url.trim() || null,

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      setError(error.message);
      setSaving(false);
      return;
    }

    try {
      await saveProductOptions(supabase, id, optionType, optionRows);
    } catch (optionsError) {
      console.error('Error saving product options:', optionsError);
      setError(optionsError.message || 'Product saved, but colours/sizes failed.');
      setSaving(false);
      return;
    }

    console.log('Product updated:', data);

    setSuccess('Product updated successfully.');

    setSaving(false);

    /*
     * RETURN TO PRODUCTS
     */

    setTimeout(() => {
      navigate('/products');
    }, 1000);
  };

  /*
   * ==========================================
   * CATEGORY NAME
   * ==========================================
   */

  const getCategoryName = (category) => {
    return (
      category.name ||
      category.category_name ||
      category.title ||
      `Category ${category.id}`
    );
  };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <div className="edit-product-page">
        <div className="products-empty">
          <div className="loading-spinner">
            Loading product...
          </div>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <div className="edit-product-page">

      {/* HEADER */}

      <div className="add-product-header">

        <div>
          <h1>Edit Product</h1>

          <p>
            Update the information for this product.
          </p>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={() => navigate('/products')}
          disabled={saving}
        >
          ← Back to Products
        </button>

      </div>


      {/* ERROR */}

      {error && (
        <div className="form-message error-message">

          <strong>Error</strong>

          <span>{error}</span>

        </div>
      )}


      {/* SUCCESS */}

      {success && (
        <div className="form-message success-message">
          {success}
        </div>
      )}


      {/* FORM */}

      <form
        className="product-form"
        onSubmit={handleSubmit}
      >

        {/* =====================================
            BASIC INFORMATION
            ===================================== */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>Basic Information</h2>

            <p>
              Update the main product information.
            </p>

          </div>


          <div className="form-grid">

            {/* PRODUCT NAME */}

            <div className="form-field full-width">

              <label htmlFor="name">
                Product Name <span>*</span>
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Product name"
                required
              />

            </div>


            {/* DESCRIPTION */}

            <div className="form-field full-width">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Product description..."
                rows="4"
              />

            </div>


            {/* CATEGORY */}

            <div className="form-field">

              <label htmlFor="category_id">
                Category
              </label>

              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                disabled={loadingCategories}
              >

                <option value="">
                  {loadingCategories
                    ? 'Loading categories...'
                    : 'Select category'}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {getCategoryName(category)}
                  </option>
                ))}

              </select>

            </div>


            {/* SKU */}

            <div className="form-field">

              <label htmlFor="sku">
                SKU
              </label>

              <input
                id="sku"
                name="sku"
                type="text"
                value={form.sku}
                onChange={handleChange}
                placeholder="Product SKU"
              />

            </div>


            {/* BARCODE */}

            <div className="form-field">

              <label htmlFor="barcode">
                Barcode
              </label>

              <input
                id="barcode"
                name="barcode"
                type="text"
                value={form.barcode}
                onChange={handleChange}
                placeholder="Product barcode"
              />

            </div>

          </div>

        </section>


        {/* =====================================
            PRICING
            ===================================== */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>Pricing</h2>

            <p>
              Update product pricing.
            </p>

          </div>


          <div className="form-grid">

            {/* COST PRICE */}

            <div className="form-field">

              <label htmlFor="cost_price">
                Cost Price
              </label>

              <div className="input-with-prefix">

                <span>KSh</span>

                <input
                  id="cost_price"
                  name="cost_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_price}
                  onChange={handleChange}
                  placeholder="0.00"
                />

              </div>

            </div>


            {/* SELLING PRICE */}

            <div className="form-field">

              <label htmlFor="price">
                Selling Price <span>*</span>
              </label>

              <div className="input-with-prefix">

                <span>KSh</span>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />

              </div>

            </div>

          </div>

        </section>


        {/* =====================================
            INVENTORY
            ===================================== */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>Inventory</h2>

            <p>
              Update stock and low-stock settings.
            </p>

          </div>


          <div className="form-grid">

            {/* STOCK */}

            <div className="form-field">

              <label htmlFor="stock_quantity">
                Stock Quantity
              </label>

              {optionType ? (
                <p className="form-field-note">
                  Stock is set for each colour or size below. Uncheck
                  Available to hide an option from customers.
                </p>
              ) : (
                <input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={handleChange}
                  placeholder="0"
                />
              )}

            </div>


            {/* LOW STOCK */}

            <div className="form-field">

              <label htmlFor="low_stock_threshold">
                Low Stock Threshold
              </label>

              <input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                step="1"
                value={form.low_stock_threshold}
                onChange={handleChange}
                placeholder="5"
              />

            </div>

          </div>

        </section>

        <ProductOptionsEditor
          optionType={optionType}
          rows={optionRows}
          onTypeChange={setOptionType}
          onRowsChange={setOptionRows}
        />


        {/* =====================================
            IMAGE
            ===================================== */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>Product Image</h2>

            <p>
              Update the product image URL.
            </p>

          </div>


          <div className="form-field full-width">

            <label htmlFor="image_url">
              Image URL
            </label>

            <input
              id="image_url"
              name="image_url"
              type="url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://example.com/product-image.jpg"
            />

          </div>

        </section>


        {/* =====================================
            ACTIONS
            ===================================== */}

        <div className="form-actions">

          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/products')}
            disabled={saving}
          >
            Cancel
          </button>


          <button
            type="submit"
            className="save-product-button"
            disabled={saving}
          >
            {saving
              ? 'Saving Changes...'
              : 'Save Changes'}
          </button>

        </div>

      </form>

    </div>
  );
}

export default EditProduct;