import { requireSupabase } from './supabase'
import { getCurrentUserId, type DbRequest } from './anyworkApi'

export type ServiceField = {
  id: string
  service_id: string
  field_key: string
  label: string
  field_type: string
  required: boolean
  placeholder: string | null
  help_text: string | null
  options: unknown[]
  validation: Record<string, unknown>
  sort_order: number
  enabled: boolean
}

export type Address = {
  id: string
  user_id: string
  label: string
  address_line1: string
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
}

export type Invoice = {
  id: string
  request_id: string
  customer_id: string
  provider_id: string
  invoice_number: string
  status: string
  subtotal: number
  tax: number
  discount: number
  total: number
  due_at: string | null
  issued_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
}

export type Payment = {
  id: string
  invoice_id: string
  customer_id: string
  provider_id: string
  amount: number
  currency: string
  method: string
  status: string
  transaction_reference: string | null
  paid_at: string | null
  created_at: string
}

export type Dispute = {
  id: string
  request_id: string
  opened_by: string
  assigned_to: string | null
  reason: string
  description: string
  status: string
  resolution: string | null
  created_at: string
}

export type SupportTicket = {
  id: string
  ticket_number: string
  user_id: string
  subject: string
  description: string
  priority: string
  status: string
  assigned_to: string | null
  created_at: string
}

export async function listServiceFields(serviceId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_fields').select('*').eq('service_id', serviceId).order('sort_order')
  if (error) throw error
  return (data || []) as ServiceField[]
}

export async function saveServiceField(input: Partial<ServiceField> & { service_id: string; field_key: string; label: string; field_type: string }) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_fields').upsert({
    id: input.id,
    service_id: input.service_id,
    field_key: input.field_key,
    label: input.label,
    field_type: input.field_type,
    required: input.required ?? false,
    placeholder: input.placeholder || null,
    help_text: input.help_text || null,
    options: input.options || [],
    validation: input.validation || {},
    sort_order: input.sort_order ?? 0,
    enabled: input.enabled ?? true,
  }).select('*').single()
  if (error) throw error
  return data as ServiceField
}

export async function deleteServiceField(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('anywork_service_fields').delete().eq('id', id)
  if (error) throw error
}

export async function listAddresses() {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }).order('created_at')
  if (error) throw error
  return (data || []) as Address[]
}

export async function saveAddress(input: Partial<Address> & { label: string; address_line1: string }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_addresses').upsert({
    id: input.id,
    user_id: userId,
    label: input.label,
    address_line1: input.address_line1,
    address_line2: input.address_line2 || null,
    city: input.city || null,
    state: input.state || null,
    postal_code: input.postal_code || null,
    country: input.country || 'Philippines',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    is_default: input.is_default ?? false,
  }).select('*').single()
  if (error) throw error
  return data as Address
}

export async function deleteAddress(id: string) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { error } = await client.from('anywork_addresses').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function listProviderAvailability() {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_availability').select('*').eq('provider_id', userId).order('weekday')
  if (error) throw error
  return data || []
}

export async function saveProviderAvailability(input: { weekday: number; start_time: string; end_time: string; enabled: boolean }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_availability').upsert({
    provider_id: userId, ...input
  }, { onConflict: 'provider_id,weekday' }).select('*').single()
  if (error) throw error
  return data
}

export async function listProviderTimeOff() {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_time_off').select('*').eq('provider_id', userId).order('starts_at')
  if (error) throw error
  return data || []
}

export async function saveProviderTimeOff(input: { starts_at: string; ends_at: string; reason?: string }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_time_off').insert({ provider_id: userId, ...input }).select('*').single()
  if (error) throw error
  return data
}

export async function listJobCheckins(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_checkins').select('*').eq('request_id', requestId).order('created_at')
  if (error) throw error
  return data || []
}

export async function addJobCheckin(input: { requestId: string; type: string; note?: string; latitude?: number; longitude?: number }) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_job_checkins').insert({
    request_id: input.requestId,
    provider_id: providerId,
    checkin_type: input.type,
    note: input.note || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function listInvoices(role?: 'customer' | 'provider') {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const column = role === 'provider' ? 'provider_id' : 'customer_id'
  const { data, error } = await client.from('anywork_invoices').select('*').eq(column, userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Invoice[]
}

export async function listInvoiceItems(invoiceId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_invoice_items').select('*').eq('invoice_id', invoiceId).order('created_at')
  if (error) throw error
  return data || []
}

export async function createInvoice(input: { requestId: string; items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>; tax?: number; discount?: number; dueAt?: string }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_create_invoice', {
    p_request_id: input.requestId,
    p_items: input.items,
    p_tax: input.tax || 0,
    p_discount: input.discount || 0,
    p_due_at: input.dueAt || null,
  })
  if (error) throw error
  return data as Invoice
}

export async function listPayments(role?: 'customer' | 'provider') {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const column = role === 'provider' ? 'provider_id' : 'customer_id'
  const { data, error } = await client.from('anywork_payments').select('*').eq(column, userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Payment[]
}

export async function recordPayment(input: { invoiceId: string; providerId: string; amount: number; method: string; reference?: string }) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_payments').insert({
    invoice_id: input.invoiceId, customer_id: customerId, provider_id: input.providerId,
    amount: input.amount, method: input.method, status: 'Succeeded',
    transaction_reference: input.reference || null, paid_at: new Date().toISOString(),
  }).select('*').single()
  if (error) throw error
  await client.from('anywork_invoices').update({ status: 'Paid', paid_at: new Date().toISOString() }).eq('id', input.invoiceId)
  return data as Payment
}

export async function listReviews(role?: 'customer' | 'provider') {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  if (role === 'provider') {
    const [received, submitted] = await Promise.all([
      client.from('anywork_reviews').select('*').eq('provider_id', userId),
      client.from('anywork_provider_reviews').select('*').eq('provider_id', userId),
    ])
    if (received.error) throw received.error
    if (submitted.error) throw submitted.error
    return [...(received.data || []), ...(submitted.data || [])].sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)))
  }
  const { data, error } = await client.from('anywork_reviews').select('*').eq('customer_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function submitProviderReview(input: { requestId: string; customerId: string; rating: number; comment?: string }) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_reviews').insert({
    request_id: input.requestId, provider_id: providerId, customer_id: input.customerId,
    rating: input.rating, comment: input.comment || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function getProviderVerification() {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_verifications').select('*').eq('provider_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function submitProviderVerification(input: { notes?: string }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_provider_verifications').upsert({ provider_id: userId, status: 'Under Review', notes: input.notes || null }).select('*').single()
  if (error) throw error
  return data
}

export async function listDisputes() {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_disputes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Dispute[]
}

export async function openDispute(requestId: string, reason: string, description: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_open_dispute', { p_request_id: requestId, p_reason: reason, p_description: description })
  if (error) throw error
  return data as Dispute
}

export async function updateDispute(id: string, status: string, resolution?: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_disputes').update({ status, resolution: resolution || null, resolved_at: ['Resolved','Closed'].includes(status) ? new Date().toISOString() : null }).eq('id', id).select('*').single()
  if (error) throw error
  return data as Dispute
}

export async function listSupportTickets() {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as SupportTicket[]
}

export async function createSupportTicket(input: { subject: string; description: string; priority?: string }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_support_tickets').insert({
    ticket_number: 'SUP-' + Date.now().toString(36).toUpperCase(),
    user_id: userId, subject: input.subject, description: input.description, priority: input.priority || 'Normal'
  }).select('*').single()
  if (error) throw error
  return data as SupportTicket
}

export async function listAdminAuditLogs() {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return data || []
}

export async function listAdminDisputes() {
  return listDisputes()
}

export async function listAdminSupportTickets() {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_support_tickets').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data || []) as SupportTicket[]
}

export async function listAdminPayments() {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_payments').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data || []) as Payment[]
}

export async function listAdminJobs() {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_requests').select('*').in('status', ['Scheduled','In Progress','Completed']).order('preferred_date', { ascending: false }).limit(300)
  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listAdminReviews() {
  const client = requireSupabase()
  const [customerReviews, providerReviews] = await Promise.all([
    client.from('anywork_reviews').select('*').limit(300),
    client.from('anywork_provider_reviews').select('*').limit(300),
  ])
  if (customerReviews.error) throw customerReviews.error
  if (providerReviews.error) throw providerReviews.error
  return [...(customerReviews.data || []), ...(providerReviews.data || [])].sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)))
}

export async function saveRequestAnswers(requestId: string, answers: Record<string, unknown>) {
  const client = requireSupabase()
  const rows = Object.entries(answers).map(([fieldId, value]) => ({
    request_id: requestId,
    field_id: fieldId,
    value,
    updated_at: new Date().toISOString(),
  }))
  if (!rows.length) return []
  const { data, error } = await client.from('anywork_request_answers').upsert(rows, { onConflict: 'request_id,field_id' }).select('*')
  if (error) throw error
  return data || []
}

export async function listRequestAnswers(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_request_answers').select('*').eq('request_id', requestId)
  if (error) throw error
  return data || []
}

export async function listFavorites() {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_favorites').select('*').eq('user_id', userId)
  if (error) throw error
  return data || []
}

export async function toggleFavorite(input: { providerId?: string; serviceId?: string }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const column = input.providerId ? 'provider_id' : 'service_id'
  const value = input.providerId || input.serviceId
  if (!value) throw new Error('A provider or service is required.')
  const { data: existing, error: existingError } = await client.from('anywork_favorites').select('id').eq('user_id', userId).eq(column, value).maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    const { error } = await client.from('anywork_favorites').delete().eq('id', existing.id)
    if (error) throw error
    return false
  }
  const { error } = await client.from('anywork_favorites').insert({ user_id: userId, [column]: value })
  if (error) throw error
  return true
}

export async function uploadJobPhoto(input: { requestId: string; file: File; photoType: 'before'|'during'|'after'|'completion'|'invoice'|'other' }) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const path = userId + '/' + input.requestId + '/' + input.photoType + '/' + crypto.randomUUID() + '-' + safeName
  const { error: uploadError } = await client.storage.from('anywork-job-files').upload(path, input.file, { contentType: input.file.type, upsert: false })
  if (uploadError) throw uploadError
  const { data, error } = await client.from('anywork_job_photos').insert({
    request_id: input.requestId,
    uploaded_by: userId,
    photo_type: input.photoType,
    storage_path: path,
    file_name: input.file.name,
    mime_type: input.file.type,
    size_bytes: input.file.size,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function listJobPhotos(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_photos').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getJobPhotoUrl(path: string, expiresIn = 3600) {
  const client = requireSupabase()
  const { data, error } = await client.storage.from('anywork-job-files').createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function listAdminVerifications() {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_provider_verifications').select('*').order('created_at', { ascending: false }).limit(300)
  if (error) throw error
  return data || []
}

export async function updateProviderVerification(id: string, status: string, notes?: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_provider_verifications').update({
    status,
    notes: notes || null,
    identity_verified: status === 'Verified',
    business_verified: status === 'Verified',
    documents_verified: status === 'Verified',
    payment_verified: status === 'Verified',
    reviewed_at: ['Verified','Rejected'].includes(status) ? new Date().toISOString() : null,
  }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function updateSupportTicket(id: string, status: string, priority?: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_support_tickets').update({
    status,
    ...(priority ? { priority } : {}),
  }).eq('id', id).select('*').single()
  if (error) throw error
  return data as SupportTicket
}
