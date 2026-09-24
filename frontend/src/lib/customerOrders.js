import { supabase } from './supabase'

const PLACEHOLDER = '/images/products/placeholder.svg'

export async function withOrderItems(orders) {
  const list = orders || []
  if (!list.length) {
    return []
  }

  const { data, error } = await supabase
    .from('order_items')
    .select(
      'id, order_id, product_id, quantity, price_at_purchase, variant_label, products(name, image_url)'
    )
    .in(
      'order_id',
      list.map((order) => order.id)
    )

  if (error) {
    console.error('Could not load ordered products:', error)
    return list.map((order) => ({ ...order, items: [] }))
  }

  const byOrder = new Map()
  for (const row of data || []) {
    const product = row.products || {}
    const item = {
      id: row.id,
      productId: row.product_id,
      name: product.name || 'Product',
      image: product.image_url || PLACEHOLDER,
      quantity: Number(row.quantity) || 1,
      price: Number(row.price_at_purchase) || 0,
      variantLabel: row.variant_label || '',
    }
    const bucket = byOrder.get(row.order_id) || []
    bucket.push(item)
    byOrder.set(row.order_id, bucket)
  }

  return list.map((order) => ({
    ...order,
    items: byOrder.get(order.id) || [],
  }))
}
