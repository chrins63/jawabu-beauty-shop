import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './adminPages.css';

const EMPTY = {
  id: null,
  name: '',
  description: '',
  duration_minutes: '60',
  price: '',
};

function Services() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('services')
      .select('id, name, description, duration_minutes, price')
      .order('name');

    if (loadError) {
      setError(loadError.message || 'Could not load services.');
      setServices([]);
    } else {
      setServices(data || []);
      setError('');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      duration_minutes: Number(form.duration_minutes) || 60,
      price: Number(form.price) || 0,
    };

    const query = form.id
      ? supabase.from('services').update(payload).eq('id', form.id)
      : supabase.from('services').insert(payload);

    const { error: saveError } = await query;
    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Could not save that service.');
      return;
    }

    setForm(EMPTY);
    setMessage(form.id ? 'Service updated.' : 'Service added. It is now on the shop.');
    load();
  };

  const remove = async (id) => {
    const { error: deleteError } = await supabase.from('services').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message || 'Could not remove that service.');
      return;
    }
    if (form.id === id) {
      setForm(EMPTY);
    }
    setServices((current) => current.filter((row) => row.id !== id));
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Services</h1>
          <p>Add the appointments customers can book on the shop.</p>
        </div>
      </div>

      {error ? <p className="admin-page-message error">{error}</p> : null}
      {message ? <p className="admin-page-message success">{message}</p> : null}

      <div className="admin-page-card">
        <h2>{form.id ? 'Edit service' : 'New service'}</h2>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="service-name">Name</label>
            <input
              id="service-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="admin-field">
            <label htmlFor="service-price">Price (KSh)</label>
            <input
              id="service-price"
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>
          <div className="admin-field">
            <label htmlFor="service-duration">Minutes</label>
            <input
              id="service-duration"
              name="duration_minutes"
              type="number"
              min="15"
              value={form.duration_minutes}
              onChange={handleChange}
              required
            />
          </div>
          <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="service-description">Description</label>
            <textarea
              id="service-description"
              name="description"
              rows="3"
              value={form.description}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="admin-gold-button" disabled={saving}>
            {saving ? 'Saving…' : form.id ? 'Update service' : 'Add service'}
          </button>
          {form.id ? (
            <button type="button" className="admin-gold-button" onClick={() => setForm(EMPTY)}>
              Cancel edit
            </button>
          ) : null}
        </form>
      </div>

      <div className="admin-page-card">
        <h2>Listed services</h2>
        {loading ? <p className="hint">Loading…</p> : null}
        {!loading && services.length === 0 ? (
          <p className="hint">No services yet. Add one above and it will appear on the shop.</p>
        ) : null}
        {services.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Minutes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                      {service.description ? <div>{service.description}</div> : null}
                    </td>
                    <td>{Number(service.price).toLocaleString('en-KE')}</td>
                    <td>{service.duration_minutes}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-gold-button"
                        onClick={() =>
                          setForm({
                            id: service.id,
                            name: service.name || '',
                            description: service.description || '',
                            duration_minutes: String(service.duration_minutes || 60),
                            price: String(service.price ?? ''),
                          })
                        }
                      >
                        Edit
                      </button>{' '}
                      <button
                        type="button"
                        className="admin-gold-button"
                        onClick={() => remove(service.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Services;
