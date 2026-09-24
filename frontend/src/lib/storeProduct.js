import { normalizeCategory } from './brand'
import { sortVariants } from './productOptions'

export function buildCategoryLookup(categories = []) {
  return (categories || []).reduce((lookup, category) => {
    lookup[category.id] = category.name || ''
    return lookup
  }, {})
}

export function normalizeStoreProduct(product, categoryLookup = {}) {
  const categoryName =
    categoryLookup[product.category_id] ||
    product.category ||
    product.category_name ||
    'Beauty'

  const variants = sortVariants(
    product.product_variants || product.variants || []
  )

  return {
    id: product.id,
    name: product.name || product.product_name || 'Unnamed Product',
    category: categoryName,
    categoryKey: normalizeCategory(categoryName),
    category_id: product.category_id,
    price: Number(product.price) || 0,
    image:
      product.image ||
      product.image_url ||
      '/images/products/placeholder.svg',
    description:
      product.description ||
      'A beautiful addition to your everyday routine.',
    stock_quantity: Number(
      product.stock_quantity ??
      product.stock_qty ??
      product.stock ??
      0
    ),
    variants,
    hasOptions: variants.length > 0,
    variant_id: product.variant_id || null,
    variant_label: product.variant_label || '',
    option_type: product.option_type || '',
    cartKey: product.cartKey || `${product.id}:${product.variant_id || 0}`,
  }
}

export function toWishlistItem(product) {
  const normalized = normalizeStoreProduct(product)

  return {
    id: normalized.id,
    name: normalized.name,
    price: normalized.price,
    image: normalized.image,
    category: normalized.category,
    description: normalized.description,
    stock_quantity: normalized.stock_quantity,
    hasOptions: normalized.hasOptions,
  }
}

export function isInStock(product) {
  const stock = Number(product?.stock_quantity)
  return Number.isFinite(stock) && stock > 0
}

export function capQuantity(quantity, stockQuantity) {
  const next = Math.max(1, Math.floor(Number(quantity) || 1))
  const stock = Number(stockQuantity)

  if (!Number.isFinite(stock)) {
    return next
  }

  if (stock <= 0) {
    return 0
  }

  return Math.min(next, stock)
}
