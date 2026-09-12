import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './adminPages.css';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '' });
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('category')
      .select('*')
      .order('name', { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setCategories([]);
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setSuccess('');
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || '',
      description: category.description || '',
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError('Category name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name,
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const previous = categories.find((item) => item.id === editingId);
      const { error: updateError } = await supabase
        .from('category')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      if (previous?.name && previous.name !== name) {
        await supabase
          .from('products')
          .update({ category: name })
          .eq('category_id', editingId);

        await supabase
          .from('products')
          .update({ category: name })
          .eq('category', previous.name);
      }

      setSuccess(`Updated ${name}.`);
    } else {
      const { error: insertError } = await supabase
        .from('category')
        .insert({
          name,
          description: description || null,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setSuccess(`Added ${name}.`);
    }

    resetForm();
    setSaving(false);
    fetchCategories();
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Delete "${category.name}"? Products using this category must be reassigned first.`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    const [{ count: byId }, { count: byName }] = await Promise.all([
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id),
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', category.name),
    ]);

    const inUse = Math.max(byId || 0, byName || 0);

    if (inUse > 0) {
      setError(
        `Cannot delete "${category.name}" while ${inUse} product(s) still use it. Reassign those products first.`
      );
      return;
    }

    const { error: deleteError } = await supabase
      .from('category')
      .delete()
      .eq('id', category.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === category.id) {
      resetForm();
    }

    setSuccess(`Deleted ${category.name}.`);
    fetchCategories();
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Categories</h1>
          <p>
            Keep the Sleek Sisters catalogue grouped by body mists, skincare,
            bags, fragrance, and gifts.
          </p>
        </div>
        <button type="button" className="admin-ghost-button" onClick={fetchCategories}>
          Refresh
        </button>
      </div>

      {error && <div className="admin-page-message error">{error}</div>}
      {success && <div className="admin-page-message success">{success}</div>}

      <section className="admin-page-card">
        <h2>{editingId ? 'Edit category' : 'Add category'}</h2>
        <p className="hint">
          Product pages store both the category name and id, so renaming here
          also updates matching products.
        </p>

        <form className="admin-form-grid wide" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Skincare Products"
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional short note"
            />
          </div>

          <div className="admin-row-actions">
            <button type="submit" className="admin-gold-button" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add category'}
            </button>
            {editingId && (
              <button type="button" className="admin-ghost-button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-page-card">
        <h2>Catalogue groups</h2>
        <p className="hint">
          {loading ? 'Loading categories...' : `${categories.length} categories`}
        </p>

        {loading ? (
          <div className="admin-empty">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="admin-empty">No categories yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td>{category.description || '—'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-ghost-button"
                          onClick={() => startEdit(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-danger-button"
                          onClick={() => handleDelete(category)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Categories;
