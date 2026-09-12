import { useEffect, useState } from 'react'
import { getStorefrontCommerce } from '../lib/storefront'
import { BRAND } from '../lib/brand'
import { whatsappHref, defaultWhatsAppText } from '../lib/whatsapp'

const WhatsAppFloat = () => {
  const [href, setHref] = useState(
    whatsappHref(BRAND.phone, defaultWhatsAppText())
  )

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setHref(
        whatsappHref(data.whatsapp_number || BRAND.phone, defaultWhatsAppText())
      )
    })
  }, [])

  return (
    <a
      className="whatsapp-float"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <span className="whatsapp-float-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M12.04 2C6.58 2 2.15 6.43 2.15 11.89c0 1.96.52 3.86 1.5 5.54L2 22l4.7-1.53a9.86 9.86 0 0 0 5.34 1.54h.01c5.46 0 9.89-4.43 9.89-9.89C21.94 6.43 17.5 2 12.04 2zm5.77 14.01c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.21-4.97-4.41-.14-.2-1.18-1.57-1.18-3 0-1.42.74-2.12 1.01-2.41.24-.26.64-.37.86-.37h.62c.2 0 .46-.04.72.55.27.63.91 2.22.99 2.38.08.16.13.35.02.56-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.16.16-.32.34-.14.66.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.5 1.54.32.16.5.13.69-.08.19-.21.8-.93 1.02-1.25.21-.32.43-.26.72-.16.29.1 1.84.87 2.15 1.02.32.16.53.24.61.37.08.13.08.76-.16 1.44z"
          />
        </svg>
      </span>
      <span className="whatsapp-float-label">WhatsApp</span>
    </a>
  )
}

export default WhatsAppFloat
