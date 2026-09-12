import { useEffect, useState } from 'react'
import { BRAND } from '../lib/brand'
import { supabase } from '../lib/supabase'
import { getStorefrontCommerce } from '../lib/storefront'
import { whatsappHref, defaultWhatsAppText } from '../lib/whatsapp'

const Contact = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [whatsapp, setWhatsapp] = useState(
    whatsappHref(BRAND.phone, defaultWhatsAppText())
  )

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setWhatsapp(
        whatsappHref(data.whatsapp_number || BRAND.phone, defaultWhatsAppText())
      )
    })
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSending(true)
    setStatus('')

    const { error } = await supabase.from('contact_messages').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim(),
    })

    setSending(false)

    if (error) {
      setStatus('We could not send that just now. Call or message us on Instagram.')
      return
    }

    setForm({ name: '', email: '', phone: '', message: '' })
    setStatus('Message received. We will get back to you shortly.')
  }

  return (
    <main className="checkout-page">
      <section className="checkout-section">
        <div className="container">
          <span className="section-eyebrow">GET IN TOUCH</span>
          <h1>Contact {BRAND.name}</h1>
          <p>
            We are here to help you choose products that suit your beauty
            needs. Reach us by phone, WhatsApp, Instagram or the form below.
          </p>

          <p>
            <strong>Phone:</strong>{' '}
            <a href={BRAND.phoneHref}>{BRAND.phone}</a>
          </p>
          <p>
            <strong>WhatsApp:</strong>{' '}
            <a href={whatsapp} target="_blank" rel="noreferrer">
              Message us
            </a>
          </p>
          <p>
            <strong>Instagram:</strong>{' '}
            <a href={BRAND.instagramUrl} target="_blank" rel="noreferrer">
              {BRAND.instagramHandle}
            </a>
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          </p>

          <form className="checkout-form" onSubmit={handleSubmit}>
            <div className="checkout-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="checkout-field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="checkout-field">
              <label htmlFor="contact-phone">Phone</label>
              <input
                id="contact-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="checkout-field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows="5"
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </form>

          {status ? <p>{status}</p> : null}
        </div>
      </section>
    </main>
  )
}

export default Contact
