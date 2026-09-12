import { supabase } from './supabase'
import { BRAND } from './brand'

const FALLBACK = {
  whatsapp_number: BRAND.phone,
  pickup_address: 'Nairobi — we confirm the exact collection point after you order.',
  phone: BRAND.phone,
  mpesa: {
    enabled: true,
    till: '',
    paybill: '',
    account_name: BRAND.name,
    stk_ready: false,
  },
  delivery_options: [],
}

let cache = null
let inflight = null

export async function getStorefrontCommerce(force = false) {
  if (cache && !force) {
    return cache
  }

  if (!inflight || force) {
    inflight = supabase
      .rpc('get_storefront_commerce')
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Could not load storefront commerce:', error)
          cache = FALLBACK
          return cache
        }

        cache = {
          ...FALLBACK,
          ...data,
          mpesa: { ...FALLBACK.mpesa, ...(data.mpesa || {}) },
          delivery_options: Array.isArray(data.delivery_options)
            ? data.delivery_options
            : [],
        }

        return cache
      })
      .catch((error) => {
        console.error('Could not load storefront commerce:', error)
        cache = FALLBACK
        return cache
      })
  }

  return inflight
}
