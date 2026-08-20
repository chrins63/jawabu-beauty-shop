import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './AddProduct.css'

function AddProduct() {
  const navigate = useNavigate();

  const categories = [
    'Makeup',
    'Skincare',
    'Hair Care',
    'Fragrance',
    'Body Care',
    'Accessories',
  ];

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
    category: '',
    image_url: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!form.price || Number(form.price) < 0) {
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
      setError(
        'Low stock threshold cannot be negative.'
      );
      return;
    }

    setSaving(true);

    // =====================================================
    // PRODUCT DATA
    // =====================================================

    const productData = {
      name: form.name.trim(),

      description:
        form.description.trim() || null,

      price:
        Number(form.price),

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

      category:
        form.category.trim() || null,

      image_url:
        form.image_url.trim() || null,

      active: true,
    };

    console.log(
      'Creating product:',
      productData
    );

    // =====================================================
    // INSERT PRODUCT
    // =====================================================

    const {
      data,
      error: insertError,
    } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (insertError) {
      console.error(
        'Error creating product:',
        insertError
      );

      setError(insertError.message);
      setSaving(false);
      return;
    }

    console.log(
      'Product created:',
      data
    );

    setSuccess(
      'Product created successfully.'
    );

    // =====================================================
    // RESET FORM
    // =====================================================

    setForm({
      name: '',
      description: '',
      price: '',
      cost_price: '',
      stock_quantity: '',
      low_stock_threshold: '5',
      sku: '',
      barcode: '',
      category: '',
      image_url: '',
    });

    setSaving(false);

    // =====================================================
    // RETURN TO PRODUCTS
    // =====================================================

    setTimeout(() => {
      navigate('/products');
    }, 1000);
  };

  return (
    <div className="add-product-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="add-product-header">

        <div>

          <h1>
            Add Product
          </h1>

          <p>
            Add a new product to the
            Jawabu Beauty catalogue.
          </p>

        </div>

        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate('/products')
          }
        >
          ← Back to Products
        </button>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="form-message error-message">

          <strong>
            Error
          </strong>

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ===================================================
          SUCCESS
      =================================================== */}

      {success && (
        <div className="form-message success-message">
          {success}
        </div>
      )}

      {/* ===================================================
          FORM
      =================================================== */}

      <form
        className="product-form"
        onSubmit={handleSubmit}
      >

        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>
              Basic Information
            </h2>

            <p>
              Enter the main information
              about the product.
            </p>

          </div>

          <div className="form-grid">

            {/* NAME */}

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
                placeholder="e.g. Curl Defining Hair Cream"
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
                placeholder="Describe the product..."
                rows="4"
              />

            </div>

            {/* CATEGORY */}

            <div className="form-field">

              <label htmlFor="category">
                Category
              </label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >

                <option value="">
                  Select category
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
                placeholder="e.g. JBW-HCR-001"
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
                placeholder="Enter barcode"
              />

            </div>

          </div>

        </section>

        {/* =================================================
            PRICING
        ================================================= */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>
              Pricing
            </h2>

            <p>
              Set the cost and selling prices.
            </p>

          </div>

          <div className="form-grid">

            {/* COST */}

            <div className="form-field">

              <label htmlFor="cost_price">
                Cost Price
              </label>

              <div className="input-with-prefix">

                <span>
                  KSh
                </span>

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

            {/* SELLING */}

            <div className="form-field">

              <label htmlFor="price">
                Selling Price <span>*</span>
              </label>

              <div className="input-with-prefix">

                <span>
                  KSh
                </span>

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

        {/* =================================================
            INVENTORY
        ================================================= */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>
              Inventory
            </h2>

            <p>
              Set the available stock and
              low-stock warning level.
            </p>

          </div>

          <div className="form-grid">

            {/* STOCK */}

            <div className="form-field">

              <label htmlFor="stock_quantity">
                Initial Stock
              </label>

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

            </div>

            {/* THRESHOLD */}

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
                value={
                  form.low_stock_threshold
                }
                onChange={handleChange}
                placeholder="5"
              />

            </div>

          </div>

        </section>

        {/* =================================================
            IMAGE
        ================================================= */}

        <section className="form-section">

          <div className="form-section-heading">

            <h2>
              Product Image
            </h2>

            <p>
              For now, enter an image URL.
              We'll add direct image uploading
              later.
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

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="form-actions">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              navigate('/products')
            }
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
              ? 'Saving Product...'
              : 'Save Product'}
          </button>

        </div>

      </form>

    </div>
  );
}

export default AddProduct;