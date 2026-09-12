export const COLOR_PRESETS = [
  'Black',
  'Brown',
  'Beige',
  'White',
  'Red',
  'Gold',
  'Navy',
  'Pink',
  'Green',
]

export const SIZE_PRESETS = ['30ml', '50ml', '100ml', 'Small', 'Medium', 'Large']

export function emptyOptionRow() {
  return {
    id: null,
    option_value: '',
    sku: '',
    price: '',
    stock_quantity: '0',
    image_url: '',
    available: true,
  }
}

export function rowsFromVariants(variants = []) {
  if (!variants.length) {
    return [emptyOptionRow()]
  }

  return variants.map((row) => ({
    id: row.id,
    option_value: row.option_value || '',
    sku: row.sku || '',
    price: row.price ?? '',
    stock_quantity: String(row.stock_quantity ?? 0),
    image_url: row.image_url || '',
    available: row.available !== false,
  }))
}

export async function saveProductOptions(supabase, productId, optionType, rows) {
  const type = optionType === 'color' || optionType === 'size' ? optionType : ''

  const { data: existing, error: loadError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)

  if (loadError) {
    throw loadError
  }

  const existingIds = (existing || []).map((row) => row.id)

  if (!type) {
    if (existingIds.length) {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId)
      if (error) throw error
    }
    return
  }

  const cleaned = rows
    .map((row, index) => ({
      ...row,
      option_value: String(row.option_value || '').trim(),
      sort_order: index,
    }))
    .filter((row) => row.option_value)

  if (!cleaned.length) {
    throw new Error('Add at least one colour or size, or turn options off.')
  }

  const keepIds = cleaned.filter((row) => row.id).map((row) => row.id)
  const toDelete = existingIds.filter((id) => !keepIds.includes(id))

  if (toDelete.length) {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .in('id', toDelete)
    if (error) throw error
  }

  for (const row of cleaned) {
    const payload = {
      product_id: Number(productId),
      option_type: type,
      option_value: row.option_value,
      sku: String(row.sku || '').trim() || null,
      price: row.price === '' || row.price === null ? null : Number(row.price),
      stock_quantity: Math.max(0, Number(row.stock_quantity) || 0),
      image_url: String(row.image_url || '').trim() || null,
      available: Boolean(row.available),
      sort_order: row.sort_order,
      updated_at: new Date().toISOString(),
    }

    if (row.id) {
      const { error } = await supabase
        .from('product_variants')
        .update(payload)
        .eq('id', row.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('product_variants').insert(payload)
      if (error) throw error
    }
  }

  const { error: syncError } = await supabase.rpc('sync_product_variant_stock', {
    p_product_id: Number(productId),
  })
  if (syncError) throw syncError
}

export function sortVariantRows(rows = []) {
  return [...rows].sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
      Number(a.id || 0) - Number(b.id || 0)
  )
}

export function productOptionRows(product) {
  return sortVariantRows(
    product?.product_variants || product?.variants || []
  )
}

export function selectableVariants(product) {
  return productOptionRows(product).filter((row) => row.available !== false)
}

export function posLineId(productId, variantId) {
  return `${productId}:${variantId || 0}`
}

export function applyVariantToProduct(product, variant) {
  if (!variant) return product

  return {
    ...product,
    price:
      variant.price == null || variant.price === ''
        ? Number(product.price) || 0
        : Number(variant.price),
    stock_quantity: Number(variant.stock_quantity || 0),
    image_url: variant.image_url || product.image_url,
  }
}

export function variantDisplayLabel(variant) {
  if (!variant) return ''
  const kind = variant.option_type === 'size' ? 'Size' : 'Colour'
  return `${kind}: ${variant.option_value}`
}
