import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BRAND } from '../lib/brand'
import { isValidKenyanPhone } from '../lib/phone'
import { formatKes } from '../lib/checkout'

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

const Services = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    serviceId: '',
    name: '',
    email: '',
    phone: '',
    date: todayInput(),
    time: '10:00',
  })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, duration_minutes, price')
        .order('name')

      if (!cancelled) {
        setServices(error ? [] : data || [])
        setLoading(false)
        if (data?.[0]) {
          setForm((current) => ({
            ...current,
            serviceId: current.serviceId || String(data[0].id),
          }))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (sending) {
      return
    }

    setStatus('')

    if (!form.serviceId) {
      setStatus('Choose a service first.')
      return
    }

    if (!form.name.trim()) {
      setStatus('Enter your name.')
      return
    }

    if (!isValidKenyanPhone(form.phone)) {
      setStatus('Enter a valid Kenyan phone number, for example 0712 345 678.')
      return
    }

    setSending(true)

    const { data, error } = await supabase.rpc('create_service_booking', {
      p_service_id: Number(form.serviceId),
      p_booking_date: form.date,
      p_start_time: form.time,
      p_customer_name: form.name.trim(),
      p_email: form.email.trim(),
      p_phone: form.phone.trim(),
    })

    setSending(false)

    if (error || data?.ok === false) {
      setStatus(data?.error || error?.message || 'That time could not be booked.')
      return
    }

    setStatus('Booked. We will confirm this appointment with you.')
  }

  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">APPOINTMENTS</span>
          <h1>Services</h1>
          <p>
            Book a visit with {BRAND.name}. Choose a service, a day, and a time.
          </p>

          {loading ? <p>Loading services…</p> : null}

          {!loading && services.length === 0 ? (
            <p>
              No services are listed yet. Call{' '}
              <a href={BRAND.phoneHref}>{BRAND.phone}</a> and we will arrange a visit.
            </p>
          ) : null}

          {services.length > 0 ? (
            <>
              <ul className="service-list">
                {services.map((service) => (
                  <li key={service.id}>
                    <strong>{service.name}</strong>
                    <span>
                      {service.duration_minutes} min · {formatKes(service.price)}
                    </span>
                    {service.description ? <p>{service.description}</p> : null}
                  </li>
                ))}
              </ul>

              <form className="checkout-form" onSubmit={handleSubmit}>
                <div className="checkout-field">
                  <label htmlFor="serviceId">Service</label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    value={form.serviceId}
                    onChange={handleChange}
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="checkout-field">
                  <label htmlFor="booking-name">Name</label>
                  <input
                    id="booking-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="booking-phone">Phone</label>
                  <input
                    id="booking-phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="booking-email">Email (optional)</label>
                  <input
                    id="booking-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="booking-date">Date</label>
                  <input
                    id="booking-date"
                    type="date"
                    name="date"
                    min={todayInput()}
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="booking-time">Start time</label>
                  <input
                    id="booking-time"
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Booking…' : 'Request booking'}
                </button>
              </form>
            </>
          ) : null}

          {status ? <p>{status}</p> : null}
        </div>
      </section>
    </main>
  )
}

export default Services
