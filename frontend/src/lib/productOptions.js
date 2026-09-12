export const COLOR_SWATCHES = {
  Black: '#111111',
  Brown: '#6b3e26',
  Beige: '#d4c4a8',
  White: '#f4f1ea',
  Red: '#b42318',
  Gold: '#d4af37',
  Navy: '#1e3a5f',
  Pink: '#e8a0bf',
  Green: '#2d5a3d',
}

export function colorSwatch(value) {
  if (!value) return '#888780'
  const match = Object.keys(COLOR_SWATCHES).find(
    (name) => name.toLowerCase() === String(value).toLowerCase()
  )
  return match ? COLOR_SWATCHES[match] : '#888780'
}

export function sortVariants(variants = []) {
  return [...variants].sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
      Number(a.id || 0) - Number(b.id || 0)
  )
}

export function availableVariants(product) {
  return (product?.variants || []).filter((row) => row.available !== false)
}

export function cartLineKey(item) {
  return item?.cartKey || `${item?.id}:${item?.variant_id || 0}`
}

export function applySelectedVariant(product, variant) {
  if (!product) return product
  if (!variant) {
    return {
      ...product,
      variant_id: null,
      variant_label: '',
      cartKey: `${product.id}:0`,
    }
  }

  return {
    ...product,
    price:
      variant.price == null || variant.price === ''
        ? Number(product.price) || 0
        : Number(variant.price),
    image: variant.image_url || product.image,
    stock_quantity: Number(variant.stock_quantity ?? 0),
    variant_id: variant.id,
    variant_label: variant.option_value,
    option_type: variant.option_type,
    cartKey: `${product.id}:${variant.id}`,
  }
}
