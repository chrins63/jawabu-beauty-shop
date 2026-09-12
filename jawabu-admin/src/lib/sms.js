export async function subscribeToSms({
  supabase,
  phone,
  name,
  source = 'pos',
}) {
  if (!phone) {
    return { error: null, skipped: true }
  }

  const { data, error } = await supabase.rpc('subscribe_to_sms', {
    p_phone: phone,
    p_name: name || null,
    p_source: source,
  })

  if (error) {
    return { error }
  }

  if (data?.ok === false) {
    return { error: { message: data.error || 'Invalid phone number' } }
  }

  return { error: null, phone: data?.phone }
}

export async function dispatchSms(supabase, payload = { action: 'flush' }) {
  const { data, error } = await supabase.functions.invoke('dispatch-sms', {
    body: payload,
  })

  return { data, error }
}
