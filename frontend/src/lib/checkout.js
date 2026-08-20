import { supabase } from './supabase'

function isMissingFunctionError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`

  return /could not find the function|does not exist|pgrst202/i.test(
    message
  )
}

export async function createCheckoutOrder({
  firstName,
  lastName,
  phone,
  email,
  address,
  city,
  items,
  deliveryFee,
}) {
  const base = {
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_email: email,
    p_delivery_address: address,
    p_city: city,
    p_payment_method: 'M-Pesa',
    p_items: items,
  }

  const withFee = {
    ...base,
    p_delivery_fee: Number(deliveryFee) || 0,
    p_sales_channel: 'online',
  }

  const firstAttempt = await supabase.rpc(
    'create_checkout_order',
    withFee
  )

  if (!firstAttempt.error) {
    return firstAttempt
  }

  if (!isMissingFunctionError(firstAttempt.error)) {
    return firstAttempt
  }

  return supabase.rpc('create_checkout_order', base)
}

export function rememberLocalOrder(orderId, email) {
  if (!orderId) {
    return
  }

  try {
    const key = 'jawabu-my-orders'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    const next = [
      {
        orderId,
        email: email || '',
        at: new Date().toISOString(),
      },
      ...existing.filter((entry) => entry.orderId !== orderId),
    ].slice(0, 50)

    localStorage.setItem(key, JSON.stringify(next))
  } catch (error) {
    console.error('Could not remember order locally:', error)
  }
}

export function getRememberedOrderIds() {
  try {
    const existing = JSON.parse(
      localStorage.getItem('jawabu-my-orders') || '[]'
    )

    return existing
      .map((entry) => entry.orderId)
      .filter(Boolean)
  } catch {
    return []
  }
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

  return (
    data.order_id ??
    data.id ??
    data.orderId ??
    null
  )
}

