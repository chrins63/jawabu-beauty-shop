import { supabase } from './supabase'

const LOCAL_ORDERS_KEY = 'sleek-my-orders'

export async function createCheckoutOrder({
  firstName,
  lastName,
  phone,
  email,
  deliveryOptionId,
  address,
  city,
  items,
  giftMessage,
  lat,
  lng,
}) {
  return supabase.rpc('create_checkout_order_with_map', {
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_email: email,
    p_delivery_option_id: Number(deliveryOptionId),
    p_delivery_address: address || '',
    p_city: city || '',
    p_payment_method: 'M-Pesa',
    p_items: items,
    p_gift_message: giftMessage || null,
    p_delivery_lat: lat == null ? null : Number(lat),
    p_delivery_lng: lng == null ? null : Number(lng),
  })
}

export async function requestMpesaStk({ orderId, contactPhone, mpesaPhone }) {
  const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
    body: {
      order_id: Number(orderId),
      contact_phone: contactPhone,
      mpesa_phone: mpesaPhone || contactPhone,
    },
  })

  if (!error) {
    return { data, error }
  }

  let detail = data?.error
  if (!detail && error.context) {
    try {
      const body = await error.context.json()
      detail = body?.error
    } catch {
      detail = ''
    }
  }

  return {
    data: data || { ok: false, error: detail || error.message },
    error: { ...error, message: detail || error.message },
  }
}

export async function getCheckoutPaymentStatus(orderId, phone) {
  return supabase.rpc('get_checkout_payment_status', {
    p_order_id: Number(orderId),
    p_phone: phone,
  })
}

export async function trackGuestOrder(orderNumber, phone) {
  return supabase.rpc('track_guest_order', {
    p_order_number: orderNumber,
    p_phone: phone,
  })
}

export function rememberLocalOrder({
  orderId,
  orderNumber,
  email,
  phone,
}) {
  if (!orderId && !orderNumber) {
    return
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]')
    const next = [
      {
        orderId,
        orderNumber: orderNumber || '',
        email: email || '',
        phone: phone || '',
        at: new Date().toISOString(),
      },
      ...existing.filter((entry) => entry.orderId !== orderId),
    ].slice(0, 50)

    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next))
  } catch (error) {
    console.error('Could not remember order locally:', error)
  }
}

export function getRememberedOrders() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]')
  } catch {
    return []
  }
}

export function getRememberedOrderIds() {
  return getRememberedOrders()
    .map((entry) => entry.orderId)
    .filter(Boolean)
}

export function extractOrderId(data) {
  if (data == null) {
    return null
  }

  if (typeof data === 'number' || typeof data === 'string') {
    return data
  }

  if (Array.isArray(data)) {
    return extractOrderId(data[0])
  }

  return data.order_id ?? data.id ?? data.orderId ?? null
}

export function formatKes(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`
}
