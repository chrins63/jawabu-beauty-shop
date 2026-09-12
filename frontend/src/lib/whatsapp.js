import { BRAND } from './brand'

export function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '')

  if (!digits) {
    return ''
  }

  if (digits.startsWith('254') && digits.length >= 12) {
    return digits.slice(0, 12)
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`
  }

  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return `254${digits}`
  }

  return ''
}

export function whatsappHref(number, text = '') {
  const msisdn = toWhatsAppNumber(number) || toWhatsAppNumber(BRAND.phone)
  if (!msisdn) {
    return '#'
  }

  const encoded = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${msisdn}${encoded}`
}

export function defaultWhatsAppText() {
  return `Hello Sleek Sisters, I would like help with an order.`
}
