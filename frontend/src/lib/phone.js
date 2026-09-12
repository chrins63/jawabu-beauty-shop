export function isValidKenyanPhone(value) {
  const cleaned = String(value || '').replace(/[\s-]/g, '')
  return /^(?:\+254|254|0)(7|1)\d{8}$/.test(cleaned)
}

export function displayPhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')

  if (digits.startsWith('254') && digits.length === 12) {
    return `0${digits.slice(3)}`
  }

  return value || ''
}
