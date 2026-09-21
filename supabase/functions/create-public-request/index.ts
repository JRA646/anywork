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

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase()
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const adminKey = getAdminKey()

  if (!supabaseUrl || !adminKey) {
    return new Response(JSON.stringify({ error: 'Request service is not configured.' }), { status: 500, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    if (body.companyWebsite) {
      return new Response(JSON.stringify({ error: 'Unable to process this request.' }), { status: 400, headers: corsHeaders })
    }

    const serviceKey = String(body.serviceKey || '').trim()
    const title = String(body.title || '').trim()
    const description = String(body.description || '').trim()
    const location = String(body.location || '').trim()
    const requesterName = String(body.requesterName || '').trim()
    const requesterEmail = normalizeEmail(body.requesterEmail)
    const requesterPhone = String(body.requesterPhone || '').trim()
    const preferredDate = body.preferredDate ? new Date(body.preferredDate) : null
    const accessNotes = String(body.accessNotes || '').trim()
    const budget = body.budget === null || body.budget === '' || body.budget === undefined ? null : Number(body.budget)

    if (!serviceKey || serviceKey.length > 80) throw new Error('Please choose a service.')
    if (!title || title.length > 120) throw new Error('Please provide a valid request title.')
    if (!description || description.length > 2000) throw new Error('Please provide the job details.')
    if (!location || location.length > 200) throw new Error('Please provide the service location.')
    if (!requesterName || requesterName.length > 120) throw new Error('Please provide your name.')
    if (!validEmail(requesterEmail)) throw new Error('Please provide a valid email address.')
    if (requesterPhone.length > 40) throw new Error('Please provide a valid phone number.')
    if (preferredDate && Number.isNaN(preferredDate.getTime())) throw new Error('Please provide a valid preferred date.')
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw new Error('Please provide a valid budget.')

    const forwarded = req.headers.get('x-forwarded-for') || ''
    const ip = (req.headers.get('cf-connecting-ip') || forwarded.split(',')[0] || 'unknown').trim()

    const admin = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: allowed, error: rateLimitError } = await admin.rpc(
      'claim_anywork_request_rate_limit',
      { p_email: requesterEmail, p_ip: ip },
    )

    if (rateLimitError) throw rateLimitError
    if (allowed === false) {
      return new Response(JSON.stringify({
        error: 'Too many requests. Please wait a little while before submitting another service request.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Retry-After': '3600' },
      })
    }

    const { data, error } = await admin
      .from('anywork_service_requests')
      .insert({
        customer_id: null,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_phone: requesterPhone || null,
        service_key: serviceKey,
        title,
        description,
        location,
        preferred_date: preferredDate?.toISOString() || null,
        access_notes: accessNotes || null,
        budget,
      })
      .select('*')
      .single()

    if (error) throw error

    return new Response(JSON.stringify({
      request: data,
      guest: true,
      quoteEmail: requesterEmail,
    }), {
      status: 201,
      headers: corsHeaders,
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unable to create this request.',
    }), {
      status: 400,
      headers: corsHeaders,
    })
  }
})
