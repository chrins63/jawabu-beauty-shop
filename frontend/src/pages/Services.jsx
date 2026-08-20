import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Services = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data, error: loadError } = await supabase
        .from('services')
        .select('id, name, description, duration_minutes, price, image_url')
        .order('name')

      if (loadError) {
        setError(
          'Service bookings are not connected yet. Add a services table in Supabase, or hide this page until the calendar ships.'
        )
        setServices([])
      } else {
        setServices(data || [])
      }

      setLoading(false)
    }

    load()
  }, [])

  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">THE SALON</span>
          <h1>Services</h1>
          <p>
            Book treatments in person for now. Online slot booking will use
            these service records once staff calendars are live.
          </p>

          {loading && <p>Loading services...</p>}

          {error && <p>{error}</p>}

          {!loading && !error && services.length === 0 && (
            <p>
              No services are listed yet. Staff can add them from the admin
              inventory once the services catalog is enabled.
            </p>
          )}

          <div className="checkout-items">
            {services.map((service) => (
              <div className="checkout-item" key={service.id}>
                <div className="checkout-item-info">
                  <strong>{service.name}</strong>
                  <span>
                    {service.duration_minutes
                      ? `${service.duration_minutes} min`
                      : 'Duration on request'}
                  </span>
                  {service.description && <p>{service.description}</p>}
                </div>
                <strong>
                  KSh {Number(service.price || 0).toLocaleString()}
                </strong>
              </div>
            ))}
          </div>

          <p>
            Prefer shopping products?{' '}
            <Link to="/shop">Visit the shop</Link>.
          </p>
        </div>
      </section>
    </main>
  )
}

export default Services
