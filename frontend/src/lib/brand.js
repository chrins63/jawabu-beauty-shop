export const BRAND = {
  name: 'Sleek Sisters',
  wordmark: 'SLEEK',
  script: 'Sisters',
  tagline: 'Grace in Every Detail',
  promise: 'Your one-stop beauty & lifestyle store',
  closing: 'Look Good. Feel Beautiful. Smell Amazing, Stay Sleek.',
  phone: '0143074416',
  phoneHref: 'tel:0143074416',
  instagramHandle: '@SLEEK_SISTERS',
  instagramUrl: 'https://instagram.com/sleek_sisters',
  email: 'hello@sleeksisters.com',
  city: 'Nairobi',
  country: 'Kenya',
}

export const HOME_CATEGORIES = [
  {
    slug: 'skincare',
    label: 'Skincare',
    name: 'Skincare Products',
    copy: 'Cleansers, serums, SPF and glow essentials.',
    image: '/images/deck/ginseng.jpg',
  },
  {
    slug: 'perfumes',
    label: 'Perfumes',
    name: 'Perfumes & Colognes',
    copy: 'Long-lasting scents for ladies and gentlemen.',
    image: '/images/deck/perfumes.jpg',
  },
  {
    slug: 'body-mists',
    label: 'Body Mists',
    name: 'Body Mists',
    copy: 'Everyday sprays that keep you smelling fresh.',
    image: '/images/deck/perfume-bottles.jpg',
  },
  {
    slug: 'bags',
    label: 'Bags',
    name: 'Handbags & Sling Bags',
    copy: 'Sling bags, handbags, travel bags and wallets.',
    image:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=85',
  },
  {
    slug: 'gifts',
    label: 'Gifts',
    name: 'Gift Packages',
    copy: 'Curated sets ready to wrap and give.',
    image: '/images/deck/caviar.jpg',
  },
]

export function normalizeCategory(value) {
  if (!value) return ''

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function categorySlug(name) {
  const normalized = normalizeCategory(name)

  if (normalized.includes('skincare')) return 'skincare'
  if (
    normalized.includes('perfume') ||
    normalized.includes('cologne') ||
    normalized.includes('fragrance')
  ) {
    return 'perfumes'
  }
  if (normalized.includes('mist')) return 'body-mists'
  if (
    normalized.includes('bag') ||
    normalized.includes('wallet') ||
    normalized.includes('handbag')
  ) {
    return 'bags'
  }
  if (normalized.includes('gift')) return 'gifts'

  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugMatchesCategory(slug, categoryName) {
  if (!slug || slug === 'all') return true
  return categorySlug(categoryName) === slug
}
