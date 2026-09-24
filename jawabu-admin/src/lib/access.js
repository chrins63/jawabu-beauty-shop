export const ALL_STAFF_ROLES = ['owner', 'admin', 'manager', 'staff']
export const CATALOGUE_ROLES = ['owner', 'admin', 'manager']
export const OWNER_ROLES = ['owner', 'admin']

export function normalizeRole(role) {
  return String(role || '').toLowerCase().trim()
}

export function isOwnerRole(role) {
  const value = normalizeRole(role)
  return value === 'owner' || value === 'admin'
}

export function isManagerRole(role) {
  const value = normalizeRole(role)
  return value === 'manager' || isOwnerRole(value)
}

export function canUseRole(role, allowed) {
  const value = normalizeRole(role)
  return (allowed || []).map(normalizeRole).includes(value)
}

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'dashboard', roles: ALL_STAFF_ROLES },
  { label: 'POS', path: '/pos', icon: 'pos', highlight: true, roles: ALL_STAFF_ROLES },
  { label: 'Orders', path: '/orders', icon: 'orders', roles: ALL_STAFF_ROLES },
  { label: 'Products', path: '/products', icon: 'products', roles: CATALOGUE_ROLES },
  { label: 'Categories', path: '/categories', icon: 'categories', roles: CATALOGUE_ROLES },
  { label: 'Inventory', path: '/inventory', icon: 'inventory', roles: CATALOGUE_ROLES },
  { label: 'Customers', path: '/customers', icon: 'customers', roles: ALL_STAFF_ROLES },
  { label: 'Inbox', path: '/inbox', icon: 'inbox', roles: ALL_STAFF_ROLES },
  { label: 'Services', path: '/services', icon: 'services', roles: CATALOGUE_ROLES },
  { label: 'Payments', path: '/payments', icon: 'payments', roles: OWNER_ROLES },
  { label: 'Staff', path: '/staff', icon: 'staff', roles: OWNER_ROLES },
  { label: 'Reports', path: '/reports', icon: 'reports', roles: CATALOGUE_ROLES },
  { label: 'Settings', path: '/settings', icon: 'settings', roles: OWNER_ROLES },
]

export function canAccessPath(role, pathname) {
  const path = String(pathname || '/').split('?')[0] || '/'

  if (path === '/login') {
    return true
  }

  const match = NAV_ITEMS.find((item) => {
    if (item.path === '/') {
      return path === '/'
    }
    return path === item.path || path.startsWith(`${item.path}/`)
  })

  if (!match) {
    return false
  }

  return canUseRole(role, match.roles)
}

export function navItemsForRole(role) {
  return NAV_ITEMS.filter((item) => canUseRole(role, item.roles))
}
