import { createClient } from 'npm:@supabase/supabase-js@2'
const encoder = new TextEncoder()

const verifyAccessToken = async (token: string) => {
  const secret = Deno.env.get('ANYWORK_ACCESS_TOKEN_SECRET')
  if (!secret) throw new Error('Guest request access is not configured.')

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const normalized = signature.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const signatureBytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))

  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payload))
  if (!valid) return null

  const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
  const paddedPayload = normalizedPayload + '='.repeat((4 - normalizedPayload.length % 4) % 4)
  const parsed = JSON.parse(atob(paddedPayload)) as { sub?: string; exp?: number }
  if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
  return parsed
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const getAdminKey = () => {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (raw) {
    try {
      const keys = JSON.parse(raw)
      if (keys.default) return keys.default
    } catch {
      // Ignore malformed secret configuration and fall back to the legacy key.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })

  try {
    const adminKey = getAdminKey()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!adminKey || !supabaseUrl) throw new Error('Guest request service is not configured.')

    const body = await req.json()
    const token = String(body.token || '')
    const verified = await verifyAccessToken(token)
    if (!verified) return new Response(JSON.stringify({ error: 'This request link is invalid or expired.' }), { status: 401, headers: corsHeaders })

    const admin = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: request, error: requestError } = await admin
      .from('anywork_service_requests')
      .select('*')
      .eq('id', verified.sub)
      .single()

    if (requestError || !request || request.customer_id) {
      if (requestError || !request) throw new Error('Request not found.')
      return new Response(JSON.stringify({ error: 'This request uses an account-based portal.' }), { status: 403, headers: corsHeaders })
    }

    const action = String(body.action || 'get')

    if (action === 'accept_quote') {
      const quoteId = String(body.quoteId || '')
      if (!quoteId) throw new Error('Quote ID is required.')
      if (['Scheduled', 'In Progress', 'Completed'].includes(request.status)) {
        throw new Error('This request is no longer accepting quotes.')
      }

      const { data: quote, error: quoteError } = await admin
        .from('anywork_quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('request_id', request.id)
        .single()

      if (quoteError || !quote) throw new Error('Quote not found.')
      if (quote.status === 'Accepted') {
        return new Response(JSON.stringify({ accepted: true, request, quote }), { status: 200, headers: corsHeaders })
      }

      const { error: declineError } = await admin
        .from('anywork_quotes')
        .update({ status: 'Declined' })
        .eq('request_id', request.id)
      if (declineError) throw declineError

      const { data: acceptedQuote, error: acceptedError } = await admin
        .from('anywork_quotes')
        .update({ status: 'Accepted' })
        .eq('id', quote.id)
        .select('*')
        .single()
      if (acceptedError) throw acceptedError

      const { data: updatedRequest, error: updateError } = await admin
        .from('anywork_service_requests')
        .update({
          selected_provider_id: quote.provider_id,
          status: 'Quoted',
        })
        .eq('id', request.id)
        .select('*')
        .single()
      if (updateError) throw updateError

      if (request.requester_email) {
        const resendKey = Deno.env.get('RESEND_API_KEY')
        const fromAddress = Deno.env.get('ANYWORK_EMAIL_FROM')
        if (resendKey && fromAddress) {
          const { data: provider } = await admin
            .from('anywork_profiles')
            .select('display_name, first_name, last_name, company_name')
            .eq('user_id', quote.provider_id)
            .maybeSingle()

          const providerName = provider?.company_name
            || provider?.display_name
            || [provider?.first_name, provider?.last_name].filter(Boolean).join(' ')
            || 'Your selected provider'

          const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#141414"><div style="max-width:680px;margin:0 auto;padding:30px 18px"><div style="background:#111;color:#fff;border-radius:18px 18px 0 0;padding:26px"><div style="font-size:11px;letter-spacing:2px;font-weight:700;color:#c8c0b5">ANYWORK SERVICES</div><h1 style="margin:10px 0 0;font-size:30px">Quote accepted</h1></div><div style="background:#fff;padding:28px;border:1px solid #e4e1d9;border-top:0;border-radius:0 0 18px 18px"><p>Hi ${escapeHtml(request.requester_name || 'there')}, you accepted ${escapeHtml(providerName)}'s quote for ${escapeHtml(request.title)}.</p><p style="font-size:28px;font-weight:800">₱${Number(acceptedQuote.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p><p style="color:#6f6961">ANYwork will keep you updated as the job moves forward.</p></div></div></body></html>`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: fromAddress,
              to: [request.requester_email],
              subject: 'ANYwork quote accepted — ' + request.request_number,
              html,
            }),
          })
        }
      }

      return new Response(JSON.stringify({
        accepted: true,
        request: updatedRequest,
        quote: acceptedQuote,
      }), { status: 200, headers: corsHeaders })
    }

    const { data: quotes, error: quotesError } = await admin
      .from('anywork_quotes')
      .select('*')
      .eq('request_id', request.id)
      .order('amount', { ascending: true })
    if (quotesError) throw quotesError

    const providerIds = Array.from(new Set((quotes || []).map((quote) => quote.provider_id)))
    let providers: unknown[] = []
    if (providerIds.length) {
      const { data: rows, error: providersError } = await admin
        .from('anywork_profiles')
        .select('user_id, display_name, first_name, last_name, company_name, avatar_url, city')
        .in('user_id', providerIds)
      if (providersError) throw providersError
      providers = rows || []
    }

    return new Response(JSON.stringify({
      request,
      quotes: quotes || [],
      providers,
      expiresAt: new Date(verified.exp * 1000).toISOString(),
    }), { status: 200, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unable to open this request.',
    }), { status: 400, headers: corsHeaders })
  }
})
