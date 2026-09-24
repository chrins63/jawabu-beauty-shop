import { supabase } from './supabase'

const PRODUCT_COLUMNS =
  'id, name, price, image_url, category, category_id, stock_quantity, description, active'

async function productsByIds(ids) {
  if (!ids.length) {
    return []
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .in('id', ids)

  if (error) {
    console.error('Could not load saved products:', error)
    return []
  }

  return data || []
}

export async function loadRemoteCart(userId) {
  const { data, error } = await supabase
    .from('customer_cart')
    .select('product_id, quantity')
    .eq('auth_user_id', userId)

  if (error) {
    console.error('Could not load saved bag:', error)
    return []
  }

  const rows = data || []
  const products = await productsByIds(rows.map((row) => row.product_id))

  return rows
    .map((row) => {
      const product = products.find((item) => item.id === row.product_id)
      if (!product) {
        return null
      }
      return { product, quantity: Number(row.quantity) || 1 }
    })
    .filter(Boolean)
}

export async function saveRemoteCart(userId, items) {
  const grouped = new Map()

  for (const item of items) {
    const productId = Number(item.id)
    const quantity = Number(item.quantity) || 0
    if (!Number.isFinite(productId) || quantity <= 0) {
      continue
    }
    grouped.set(productId, (grouped.get(productId) || 0) + quantity)
  }

  const rows = [...grouped.entries()].map(([product_id, quantity]) => ({
    auth_user_id: userId,
    product_id,
    quantity,
  }))

  if (rows.length) {
    const { error } = await supabase
      .from('customer_cart')
      .upsert(rows, { onConflict: 'auth_user_id,product_id' })

    if (error) {
      console.error('Could not save bag:', error)
      return
    }
  }

  const ids = rows.map((row) => row.product_id)
  let query = supabase.from('customer_cart').delete().eq('auth_user_id', userId)

  if (ids.length) {
    query = query.not('product_id', 'in', `(${ids.join(',')})`)
  }

  const { error: deleteError } = await query
  if (deleteError) {
    console.error('Could not update saved bag:', deleteError)
  }
}

export async function loadRemoteWishlist(userId) {
  const { data, error } = await supabase
    .from('customer_wishlist')
    .select('product_id')
    .eq('auth_user_id', userId)

  if (error) {
    console.error('Could not load saved wishlist:', error)
    return []
  }

  return productsByIds((data || []).map((row) => row.product_id))
}

export async function saveRemoteWishlist(userId, items) {
  const ids = [
    ...new Set(
      items
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id))
    ),
  ]

  if (ids.length) {
    const { error } = await supabase.from('customer_wishlist').upsert(
      ids.map((product_id) => ({
        auth_user_id: userId,
        product_id,
      })),
      { onConflict: 'auth_user_id,product_id' }
    )

    if (error) {
      console.error('Could not save wishlist:', error)
      return
    }
  }

  let query = supabase
    .from('customer_wishlist')
    .delete()
    .eq('auth_user_id', userId)

  if (ids.length) {
    query = query.not('product_id', 'in', `(${ids.join(',')})`)
  }

  const { error: deleteError } = await query
  if (deleteError) {
    console.error('Could not update saved wishlist:', deleteError)
  }
}
