export async function subscribeToEmail({
  supabase,
  email,
  name,
  source = 'pos',
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
    return { error }
  }

  if (data?.ok === false) {
    return { error: { message: data.error || 'Invalid email address' } }
  }

  return { error: null, email: data?.email }
}

export async function dispatchEmail(supabase, payload = { action: 'flush' }) {
  const { data, error } = await supabase.functions.invoke('dispatch-email', {
    body: payload,
  })

  return { data, error }
}
