export async function subscribeToEmail({
  supabase,
  email,
  name,
  source = 'checkout',
}) {
  if (!email) {
    return { error: null, skipped: true }
  }

  const { data, error } = await supabase.rpc('subscribe_to_email', {
    p_email: email,
    p_name: name || null,
    p_source: source,
  })

  if (error) {
    return { error, skipped: false }
  }

  if (data?.ok === false) {
    return {
      error: { message: data.error || 'Could not save this email address.' },
      skipped: false,
    }
  }

  return { error: null, skipped: false, email: data?.email }
}

export async function dispatchEmail(supabase, payload = { action: 'flush' }) {
  const { data, error } = await supabase.functions.invoke('dispatch-email', {
    body: payload,
  })

  return { data, error }
}
