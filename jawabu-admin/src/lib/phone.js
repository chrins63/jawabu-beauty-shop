export function looksLikePhone(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.includes('@')) {
    return false;
  }

  const digits = trimmed.replace(/[^0-9]/g, '');
  return digits.length >= 9;
}

export function normalizeKenyanPhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('254') && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return `+254${digits}`;
  }

  return `+${digits}`;
}

export function phoneLookupValues(value) {
  const raw = String(value || '').trim();
  const e164 = normalizeKenyanPhone(raw);
  const digits = e164.replace(/^\+/, '');
  const local = digits.startsWith('254') ? `0${digits.slice(3)}` : digits;

  return [...new Set([raw, e164, digits, local].filter(Boolean))];
}

export function formatOrderCustomer(order) {
  const name = `${order?.first_name || ''} ${order?.last_name || ''}`.trim();

  if (name) {
    return name;
  }

  if (String(order?.sales_channel || '').toLowerCase() === 'pos') {
    return 'Walk-in (POS)';
  }

  return 'Guest customer';
}
