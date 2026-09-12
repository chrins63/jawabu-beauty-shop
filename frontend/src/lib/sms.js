export async function subscribeToSms({
  supabase,
  phone,
  name,
  source = 'checkout',
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
    return { error, skipped: false }
  }

  if (data?.ok === false) {
    return {
      error: { message: data.error || 'Could not save this phone number.' },
      skipped: false,
    }
  }

  return { error: null, skipped: false, phone: data?.phone }
}

export async function dispatchSms(supabase, payload = { action: 'flush' }) {
  const { data, error } = await supabase.functions.invoke('dispatch-sms', {
    body: payload,
  })

  return { data, error }
}
