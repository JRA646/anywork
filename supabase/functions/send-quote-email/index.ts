import { createClient } from 'npm:@supabase/supabase-js@2'

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
      // Fall through to legacy env.
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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  const adminKey = getAdminKey()
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromAddress = Deno.env.get('ANYWORK_EMAIL_FROM')

  if (!supabaseUrl || !publishableKeys || !adminKey) {
    return new Response(JSON.stringify({ error: 'Email service is not configured.' }), { status: 500, headers: corsHeaders })
  }
  if (!resendKey || !fromAddress) {
    return new Response(JSON.stringify({ error: 'Quote email is not configured yet. Add RESEND_API_KEY and ANYWORK_EMAIL_FROM to Supabase Edge Function secrets.' }), { status: 503, headers: corsHeaders })
  }
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders })
  }

  try {
    const keys = JSON.parse(publishableKeys)
    const publicKey = keys.default
    const authClient = createClient(supabaseUrl, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const quoteId = String(body.quoteId || '').trim()
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'Quote ID is required.' }), { status: 400, headers: corsHeaders })
    }

    const admin = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: quote, error: quoteError } = await admin
      .from('anywork_quotes')
      .select('*')
      .eq('id', quoteId)
      .single()
    if (quoteError || !quote) throw new Error('Quote not found.')
    if (quote.provider_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'You can only email your own quotes.' }), { status: 403, headers: corsHeaders })
    }

    const { data: request, error: requestError } = await admin
      .from('anywork_service_requests')
      .select('*')
      .eq('id', quote.request_id)
      .single()
    if (requestError || !request) throw new Error('Request not found.')

    let recipientEmail = request.requester_email || ''
    let recipientName = request.requester_name || 'Customer'

    if (!recipientEmail && request.customer_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(request.customer_id)
      recipientEmail = authUser.user?.email || ''
      if (!recipientName || recipientName === 'Customer') {
        recipientName = authUser.user?.user_metadata?.display_name || authUser.user?.user_metadata?.first_name || 'Customer'
      }
    }

    if (!recipientEmail) throw new Error('This request does not have a customer email address.')

    const { data: provider } = await admin
      .from('anywork_profiles')
      .select('display_name, first_name, last_name, company_name')
      .eq('user_id', quote.provider_id)
      .maybeSingle()

    const providerName = provider?.company_name
      || provider?.display_name
      || [provider?.first_name, provider?.last_name].filter(Boolean).join(' ')
      || 'ANYwork provider'

    const availability = quote.availability
      ? new Date(quote.availability).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Flexible availability'

    const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#141414">
    <div style="max-width:680px;margin:0 auto;padding:30px 18px">
      <div style="background:#111;color:#fff;border-radius:18px 18px 0 0;padding:26px">
        <div style="font-size:11px;letter-spacing:2px;font-weight:700;color:#c8c0b5">ANYWORK SERVICES</div>
        <h1 style="margin:10px 0 0;font-size:30px;line-height:1.15">You received a quote</h1>
        <p style="margin:8px 0 0;color:#bdb6ad;font-size:13px">Request ${escapeHtml(request.request_number)} · ${escapeHtml(request.title)}</p>
      </div>
      <div style="background:#fff;padding:28px;border:1px solid #e4e1d9;border-top:0;border-radius:0 0 18px 18px">
        <p style="margin:0 0 18px;font-size:14px">Hi ${escapeHtml(recipientName)}, ${escapeHtml(providerName)} sent you a quote through ANYwork.</p>
        <div style="background:#f7f5ef;border-radius:14px;padding:18px">
          <div style="color:#888178;font-size:10px;text-transform:uppercase;letter-spacing:1px">QUOTE AMOUNT</div>
          <div style="margin-top:5px;font-size:34px;font-weight:800">$\{Number(quote.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          <div style="margin-top:13px;color:#6f6961;font-size:12px">Availability: ${escapeHtml(availability)}</div>
        </div>
        <div style="margin-top:18px">
          <div style="font-size:10px;color:#918a82;text-transform:uppercase;letter-spacing:1px">PROVIDER MESSAGE</div>
          <p style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:#57524b">${escapeHtml(quote.message)}</p>
        </div>
        <div style="border-top:1px solid #eee9e1;margin-top:22px;padding-top:18px;color:#777169;font-size:12px;line-height:1.6">
          Service: ${escapeHtml(request.service_key)}<br/>
          Location: ${escapeHtml(request.location)}
        </div>
      </div>
    </div>
  </body>
</html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject: 'ANYwork quote for ' + request.request_number + ' — ' + request.title,
        html,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      await admin.from('anywork_quotes').update({
        email_error: result?.message || 'Resend rejected the email.',
      }).eq('id', quote.id)
      throw new Error(result?.message || 'Unable to send quote email.')
    }

    const messageId = result?.id || null
    await admin.from('anywork_quotes').update({
      email_sent_at: new Date().toISOString(),
      email_message_id: messageId,
      email_error: null,
    }).eq('id', quote.id)

    return new Response(JSON.stringify({ sent: true, messageId, recipientEmail }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unable to send quote email.',
    }), {
      status: 400,
      headers: corsHeaders,
    })
  }
})
