import { applySelectedVariant } from './productOptions'
import { normalizeStoreProduct } from './storeProduct'
import { supabase } from './supabase'

const PRODUCT_COLUMNS =
  'id, name, price, image_url, category, category_id, stock_quantity, description, active, product_variants(id, option_type, option_value, price, image_url, stock_quantity, available, sort_order)'

function lineIdentity(item) {
  const productId = Number(item.id ?? item.product_id)
  const variantId = Number(item.variant_id) || 0
  return `${productId}:${variantId}`
}

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

function cartLineFromRow(row, product) {
  const normalized = normalizeStoreProduct(product)
  const variant = (normalized.variants || []).find(
    (item) => Number(item.id) === Number(row.variant_id)
  )
  const line = variant
    ? applySelectedVariant(normalized, variant)
    : {
        ...normalized,
        variant_id: null,
        variant_label: row.variant_label || '',
        cartKey: `${normalized.id}:0`,
      }

  return {
    ...line,
    quantity: Number(row.quantity) || 1,
  }
}

export async function loadRemoteCart(userId) {
  const { data, error } = await supabase
    .from('customer_cart')
    .select('product_id, quantity, variant_id, variant_label')
    .eq('auth_user_id', userId)

  if (error) {
    console.error('Could not load saved bag:', error)
    return null
  }

  const rows = data || []
  const products = await productsByIds(rows.map((row) => row.product_id))

  return rows
    .map((row) => {
      const product = products.find((item) => item.id === row.product_id)
      if (!product) {
        return null
      }
      return cartLineFromRow(row, product)
    })
    .filter(Boolean)
}

export async function saveRemoteCart(userId, items) {
  const grouped = new Map()

  for (const item of items) {
    const productId = Number(item.id)
    const quantity = Number(item.quantity) || 0
    const variantId = Number(item.variant_id) || 0
    if (!Number.isFinite(productId) || quantity <= 0) {
      continue
    }
    const key = `${productId}:${variantId}`
    const current = grouped.get(key)
    grouped.set(key, {
      product_id: productId,
      variant_id: variantId || null,
      variant_label: item.variant_label || null,
      quantity: (current?.quantity || 0) + quantity,
    })
  }

  const rows = [...grouped.values()].map((row) => ({
    auth_user_id: userId,
    product_id: row.product_id,
    variant_id: row.variant_id,
    variant_label: row.variant_label,
    quantity: row.quantity,
  }))

  if (rows.length) {
    const { error } = await supabase
      .from('customer_cart')
      .upsert(rows, { onConflict: 'auth_user_id,product_id,variant_id' })

    if (error) {
      console.error('Could not save bag:', error)
      return
    }
  }

  const { data: existing, error: listError } = await supabase
    .from('customer_cart')
    .select('id, product_id, variant_id')
    .eq('auth_user_id', userId)

  if (listError) {
    console.error('Could not update saved bag:', listError)
    return
  }

  const keep = new Set(rows.map((row) => lineIdentity(row)))
  const staleIds = (existing || [])
    .filter((row) => !keep.has(lineIdentity(row)))
    .map((row) => row.id)

  if (!staleIds.length) {
    return
  }

  const { error: deleteError } = await supabase
    .from('customer_cart')
    .delete()
    .in('id', staleIds)

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
    return null
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
