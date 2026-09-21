import { requireSupabase } from './supabase'

export type DbRequest = {
  id: string
  request_number: string
  customer_id: string | null
  requester_name: string | null
  requester_email: string | null
  requester_phone: string | null
  service_key: string
  title: string
  description: string
  location: string
  preferred_date: string | null
  access_notes: string | null
  budget: number | null
  status: 'Requested' | 'Quoted' | 'Scheduled' | 'In Progress' | 'Completed'
  selected_provider_id: string | null
  created_at: string
  updated_at: string
}

export type DbQuote = {
  id: string
  request_id: string
  provider_id: string
  amount: number
  availability: string | null
  message: string
  status: 'Pending' | 'Accepted' | 'Declined'
  created_at: string
  updated_at: string
}

export type DbProfile = {
  user_id: string
  role: 'customer' | 'provider' | 'admin'
  first_name: string
  last_name: string
  display_name: string
  company_name: string | null
  avatar_url: string | null
  city: string | null
  is_active: boolean
}

export type DbService = {
  id: string
  title: string
  label: string
  description: string
  icon: string
  items: string[]
  tags?: string[]
  category?: string
  subcategory?: string
  starting_price: number | null
  starting_price_label: string | null
  image_url: string | null
  enabled: boolean
}

export type DbPublicProvider = {
  id: string
  name: string
  initials: string
  service_ids: string[]
  rating: number
  review_count: number
  completed_jobs: number
  location: string
  response_time: string
  response_rate: string
  summary: string
  verified: boolean
}

export type DbPublicProviderReview = {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

export async function listPublicProviders(): Promise<DbPublicProvider[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_list_public_providers')
  if (error) throw error

  const rows = (data || []) as unknown as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: String(row.id || ''),
    name: String(row.name || ''),
    initials: String(row.initials || ''),
    service_ids: Array.isArray(row.service_ids) ? row.service_ids.map((value) => String(value)) : [],
    rating: Number(row.rating || 0),
    review_count: Number(row.review_count || 0),
    completed_jobs: Number(row.completed_jobs || 0),
    location: String(row.location || ''),
    response_time: String(row.response_time || '—'),
    response_rate: String(row.response_rate || '—'),
    summary: String(row.summary || ''),
    verified: Boolean(row.verified),
  }))
}

export async function listPublicProviderReviews(providerId: string): Promise<DbPublicProviderReview[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_list_public_provider_reviews', {
    p_provider_id: providerId,
  })
  if (error) throw error

  const rows = (data || []) as unknown as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: String(row.id || ''),
    rating: Number(row.rating || 0),
    comment: row.comment == null ? null : String(row.comment),
    created_at: String(row.created_at || ''),
  }))
}

export async function listPublicServices() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_services')
    .select('id, title, label, description, icon, items, tags, category, subcategory, starting_price, starting_price_label, image_url, enabled')
    .eq('enabled', true)
    .order('title', { ascending: true })

  if (error) throw error
  return (data || []) as DbService[]
}

export type AdminServiceInput = {
  id?: string
  category: string
  subcategory: string
  title: string
  label: string
  description: string
  icon?: string
  items?: string[]
  startingPrice?: number | null
  startingPriceLabel?: string | null
  tags?: string[]
  enabled?: boolean
  imageUrl?: string | null
}

export async function listAdminServices() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_services')
    .select('id, category, subcategory, title, label, description, icon, items, tags, starting_price, starting_price_label, image_url, enabled')
    .order('category', { ascending: true })
    .order('subcategory', { ascending: true })
    .order('label', { ascending: true })
  if (error) throw error
  return (data || []) as (DbService & { category: string; subcategory: string })[]
}

export async function createAdminService(input: AdminServiceInput) {
  const client = requireSupabase()
  const slug = (input.category + '-' + input.subcategory + '-' + input.label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const id = input.id || slug + '-' + crypto.randomUUID().slice(0, 8)

  const { data, error } = await client
    .from('anywork_services')
    .insert({
      id,
      category: input.category,
      subcategory: input.subcategory,
      title: input.title,
      label: input.label,
      description: input.description,
      icon: input.icon || 'Store',
      items: input.items || [],
      tags: input.tags || [],
      starting_price: input.startingPrice ?? null,
      starting_price_label: input.startingPriceLabel || (input.startingPrice != null ? '
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export async function updateAdminService(id: string, input: Partial<AdminServiceInput>) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_services')
    .update({
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subcategory !== undefined ? { subcategory: input.subcategory } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.items !== undefined ? { items: input.items } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.startingPrice !== undefined ? { starting_price: input.startingPrice } : {}),
      ...(input.startingPriceLabel !== undefined ? { starting_price_label: input.startingPriceLabel } : {}),
      ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export type DbRequestPhoto = {
  id: string
  request_id: string
  customer_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  signed_url?: string
}

export type DbMessage = {
  id: string
  request_id: string | null
  sender_id: string
  receiver_id: string
  body: string
  attachment_url: string | null
  read_at: string | null
  created_at: string
}

export async function getCurrentUserId() {
  const client = requireSupabase()

  // Prefer the locally persisted session so short-lived token-refresh races do
  // not make an already authenticated workspace appear logged out.
  const sessionResult = await client.auth.getSession()
  if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user.id
  }

  // Recover once when the access token needs to be refreshed.
  const refreshed = await client.auth.refreshSession()
  if (refreshed.data.session?.user) {
    return refreshed.data.session.user.id
  }

  const userResult = await client.auth.getUser()
  if (!userResult.error && userResult.data.user) {
    return userResult.data.user.id
  }

  throw new Error('Your login session is no longer available. Please sign in again.')
}

export async function uploadRequestPhoto(requestId: string, file: File) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are supported.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Each photo must be 5 MB or smaller.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const storagePath = `${requestId}/${customerId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await client.storage
    .from('anywork-request-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await client
    .from('anywork_request_photos')
    .insert({
      request_id: requestId,
      customer_id: customerId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('*')
    .single()

  if (error) {
    await client.storage.from('anywork-request-photos').remove([storagePath])
    throw error
  }

  return data as DbRequestPhoto
}

export async function listRequestPhotos(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_photos')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  const photos = (data || []) as DbRequestPhoto[]
  if (!photos.length) return photos

  const { data: signed, error: signedError } = await client.storage
    .from('anywork-request-photos')
    .createSignedUrls(photos.map((photo) => photo.storage_path), 3600)

  if (signedError) throw signedError

  return photos.map((photo) => ({
    ...photo,
    signed_url: signed?.find((item) => item.path === photo.storage_path)?.signedUrl || undefined,
  }))
}

export async function deleteRequestPhoto(photo: DbRequestPhoto) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (photo.customer_id !== customerId) {
    throw new Error('You can only remove photos from your own requests.')
  }

  const { error: storageError } = await client.storage
    .from('anywork-request-photos')
    .remove([photo.storage_path])
  if (storageError) throw storageError

  const { error } = await client
    .from('anywork_request_photos')
    .delete()
    .eq('id', photo.id)
    .eq('customer_id', customerId)

  if (error) throw error
}

export async function createServiceRequest(input: {
  serviceKey: string
  title: string
  description: string
  location: string
  preferredDate?: string | null
  accessNotes?: string | null
  budget?: number | null
  requesterName?: string
  requesterEmail?: string
  requesterPhone?: string | null
  companyWebsite?: string
}) {
  const client = requireSupabase()

  const sessionResult = await client.auth.getSession()
  const userId = sessionResult.data.session?.user?.id

  if (!userId) {
    const { data, error } = await client.functions.invoke('create-public-request', {
      body: {
        serviceKey: input.serviceKey,
        title: input.title,
        description: input.description,
        location: input.location,
        preferredDate: input.preferredDate || null,
        accessNotes: input.accessNotes || null,
        budget: input.budget ?? null,
        requesterName: input.requesterName?.trim() || '',
        requesterEmail: input.requesterEmail?.trim() || '',
        requesterPhone: input.requesterPhone?.trim() || '',
        companyWebsite: input.companyWebsite || '',
      },
    })

    if (error) throw error
    const response = data as { request?: DbRequest; error?: string } | null
    if (!response?.request) throw new Error(response?.error || 'Unable to create this request.')
    return response.request
  }

  const { data, error } = await client
    .from('anywork_service_requests')
    .insert({
      customer_id: userId,
      requester_name: input.requesterName?.trim() || null,
      requester_email: input.requesterEmail?.trim() || sessionResult.data.session?.user?.email || null,
      requester_phone: input.requesterPhone?.trim() || null,
      service_key: input.serviceKey,
      title: input.title,
      description: input.description,
      location: input.location,
      preferred_date: input.preferredDate || null,
      access_notes: input.accessNotes || null,
      budget: input.budget ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listCustomerRequests() {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listCustomerQuotes(requestIds?: string[]) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  let query = client
    .from('anywork_quotes')
    .select('*, anywork_service_requests!inner(customer_id)')
    .eq('anywork_service_requests.customer_id', customerId)
    .order('created_at', { ascending: false })
  if (requestIds?.length) query = query.in('request_id', requestIds)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => row as unknown as DbQuote)
}

export async function getRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listQuotesForRequests(requestIds: string[]) {
  if (!requestIds.length) return [] as DbQuote[]
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .in('request_id', requestIds)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listQuotesForRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('request_id', requestId)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listProfiles(userIds: string[]) {
  if (!userIds.length) return []
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active')
    .in('user_id', userIds)

  if (error) throw error
  return (data || []) as DbProfile[]
}

export async function listProviderRequests() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listProviderQuotes() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export type DbProviderService = {
  id: string
  provider_id: string
  service_key: string
  enabled: boolean
  starting_price: number | null
  minimum_job_value: number | null
  service_area: string | null
  lead_time_days: number
  created_at: string
  updated_at: string
}

export async function listProviderServices() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbProviderService[]
}

export async function saveProviderService(input: {
  serviceKey: string
  enabled?: boolean
  startingPrice?: number | null
  minimumJobValue?: number | null
  serviceArea?: string | null
  leadTimeDays?: number
}) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .upsert({
      provider_id: providerId,
      service_key: input.serviceKey,
      enabled: input.enabled ?? true,
      starting_price: input.startingPrice ?? null,
      minimum_job_value: input.minimumJobValue ?? null,
      service_area: input.serviceArea || null,
      lead_time_days: input.leadTimeDays ?? 1,
    }, { onConflict: 'provider_id,service_key' })
    .select('*')
    .single()

  if (error) throw error
  return data as DbProviderService
}

export type CreateQuoteResult = {
  quote: DbQuote
  emailSent: boolean
  emailError?: string
}

export async function createQuote(input: {
  requestId: string
  amount: number
  availability?: string | null
  message: string
}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_create_quote', {
    p_request_id: input.requestId,
    p_amount: input.amount,
    p_availability: input.availability || null,
    p_message: input.message,
  })
  if (error) throw error

  const quote = data as DbQuote

  try {
    const { data: emailData, error: emailError } = await client.functions.invoke('send-quote-email', {
      body: { quoteId: quote.id },
    })

    if (emailError) {
      return { quote, emailSent: false, emailError: emailError.message }
    }

    const response = emailData as { sent?: boolean; error?: string } | null
    return {
      quote,
      emailSent: Boolean(response?.sent),
      emailError: response?.error,
    }
  } catch (emailError) {
    return {
      quote,
      emailSent: false,
      emailError: emailError instanceof Error ? emailError.message : 'Unable to send quote email.',
    }
  }
}

export async function retryQuoteEmail(quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('send-quote-email', {
    body: { quoteId },
  })
  if (error) throw error
  return data as { sent?: boolean; messageId?: string; recipientEmail?: string; error?: string }
}

export async function acceptQuote(requestId: string, quoteId: string, providerId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_accept_quote', {
    p_request_id: requestId,
    p_quote_id: quoteId,
  })
  if (error) throw error
  if (data?.provider_id && data.provider_id !== providerId) throw new Error('The selected quote provider no longer matches the request.')
}

export async function updateProviderJobStatus(requestId: string, status: 'In Progress' | 'Completed') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_update_job_status', {
    p_request_id: requestId,
    p_status: status,
  })
  if (error) throw error
  return data as DbRequest
}

export async function sendMessage(input: {
  requestId?: string | null
  receiverId: string
  body: string
}) {
  const client = requireSupabase()
  const senderId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_messages')
    .insert({
      request_id: input.requestId || null,
      sender_id: senderId,
      receiver_id: input.receiverId,
      body: input.body,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbMessage
}

export async function listMessages(requestId?: string | null) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  let query = client
    .from('anywork_messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true })

  if (requestId) query = query.eq('request_id', requestId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as DbMessage[]
}

export async function markMessagesRead(messageIds: string[]) {
  if (!messageIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  const { error } = await client
    .from('anywork_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('receiver_id', userId)

  if (error) throw error
}

export type DbRequestEvent = {
  id: string
  request_id: string
  event_type: string
  actor_user_id: string | null
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbNotification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  request_id: string | null
  quote_id: string | null
  message_id: string | null
  read_at: string | null
  created_at: string
}

export type GuestPortalProvider = {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  avatar_url: string | null
  city: string | null
}

export type GuestPortalResponse = {
  request: DbRequest
  quotes: DbQuote[]
  providers: GuestPortalProvider[]
  expiresAt: string
}

export async function listRequestEvents(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbRequestEvent[]
}

export async function listNotifications(limit = 30) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client
    .from('anywork_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as DbNotification[]
}

export async function markNotificationsRead(notificationIds: string[]) {
  if (!notificationIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { error } = await client
    .from('anywork_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', notificationIds)

  if (error) throw error
}

export async function subscribeToNotifications(
  onNotification: (notification: DbNotification) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbNotification
        onNotification(notification)
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestEvents(
  requestId: string,
  onEvent: (event: DbRequestEvent) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel(`anywork:request-events:${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anywork_request_events',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => onEvent(payload.new as DbRequestEvent),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export async function getGuestRequestPortal(token: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'get' },
  })

  if (error) throw error
  return data as GuestPortalResponse
}

export async function acceptGuestQuote(token: string, quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'accept_quote', quoteId },
  })

  if (error) throw error
  return data as { accepted: boolean; request: DbRequest; quote: DbQuote }
}

export type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export type DbRealtimeChange<T> = {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  record: T | null
  oldRecord: Partial<T> | null
}

export async function subscribeToRequests(
  onChange: (change: DbRealtimeChange<DbRequest>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_service_requests',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbRequest>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbRequest,
          oldRecord: payload.old as Partial<DbRequest>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToQuotes(
  onChange: (change: DbRealtimeChange<DbQuote>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:quotes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_quotes',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbQuote>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbQuote,
          oldRecord: payload.old as Partial<DbQuote>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToUserMessages(
  onMessage: (message: DbMessage) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_messages',
      },
      (payload) => {
        const message = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbMessage
        if (message.sender_id === userId || message.receiver_id === userId) {
          onMessage(message)
        }
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestMessages(
  requestId: string,
  onMessage: (message: DbMessage) => void,
) {
  return subscribeToUserMessages((message) => {
    if (message.request_id === requestId) onMessage(message)
  })
}


export type DbJobSchedule = {
  id: string
  request_id: string
  proposed_start: string | null
  proposed_end: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DbJobActivity = {
  id: string
  request_id: string
  actor_user_id: string | null
  activity_type: string
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbChangeRequest = {
  id: string
  request_id: string
  provider_id: string
  description: string
  amount_delta: number
  status: 'Pending' | 'Approved' | 'Rejected'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export async function getJobSchedule(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_schedules').select('*').eq('request_id', requestId).maybeSingle()
  if (error) throw error
  return data as DbJobSchedule | null
}

export async function confirmJobSchedule(input: { requestId: string; start: string; end?: string | null; notes?: string | null }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_confirm_schedule', {
    p_request_id: input.requestId,
    p_start: input.start,
    p_end: input.end || null,
    p_notes: input.notes || null,
  })
  if (error) throw error
  return data as DbRequest
}

export async function listJobActivities(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_activities').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as DbJobActivity[]
}

export async function listChangeRequests(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_change_requests').select('*').eq('request_id', requestId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DbChangeRequest[]
}

export async function createChangeRequest(input: { requestId: string; description: string; amountDelta: number }) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_change_requests').insert({
    request_id: input.requestId,
    provider_id: providerId,
    description: input.description,
    amount_delta: input.amountDelta,
  }).select('*').single()
  if (error) throw error
  return data as DbChangeRequest
}

export async function approveChangeRequest(changeRequestId: string, approved: boolean) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data: change, error: changeError } = await client.from('anywork_change_requests').select('*').eq('id', changeRequestId).single()
  if (changeError) throw changeError

  const { data, error } = await client.from('anywork_change_requests')
    .update({
      status: approved ? 'Approved' : 'Rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', changeRequestId)
    .eq('status', 'Pending')
    .select('*')
    .single()
  if (error) throw error

  if (approved && change.amount_delta) {
    const request = await getRequest(change.request_id)
    const currentBudget = Number(request.budget || 0)
    await client.from('anywork_service_requests').update({ budget: currentBudget + Number(change.amount_delta) }).eq('id', change.request_id)
  }
  return data as DbChangeRequest
}

export async function submitJobReview(input: { requestId: string; providerId: string; rating: number; comment?: string }) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_reviews').insert({
    request_id: input.requestId,
    customer_id: customerId,
    provider_id: input.providerId,
    rating: input.rating,
    comment: input.comment || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export type AdminOverviewStats = {
  requests: number
  openRequests: number
  completedJobs: number
  providers: number
  activeProviders: number
  customers: number
  gmv: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const client = requireSupabase()
  const [requests, providers, customers, quotes] = await Promise.all([
    client.from('anywork_service_requests').select('status, budget'),
    client.from('anywork_profiles').select('user_id, role, is_active').eq('role', 'provider'),
    client.from('anywork_profiles').select('user_id').eq('role', 'customer'),
    client.from('anywork_quotes').select('amount, status'),
  ])
  if (requests.error) throw requests.error
  if (providers.error) throw providers.error
  if (customers.error) throw customers.error
  if (quotes.error) throw quotes.error

  const requestRows = requests.data || []
  const providerRows = providers.data || []
  const customerRows = customers.data || []
  const quoteRows = quotes.data || []
  return {
    requests: requestRows.length,
    openRequests: requestRows.filter((row) => row.status !== 'Completed').length,
    completedJobs: requestRows.filter((row) => row.status === 'Completed').length,
    providers: providerRows.length,
    activeProviders: providerRows.filter((row) => row.is_active).length,
    customers: customerRows.length,
    gmv: quoteRows.filter((row) => row.status === 'Accepted').reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }
}

export async function listAdminRequests(limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listAdminProfiles(role?: 'customer' | 'provider' | 'admin', limit = 200) {
  const client = requireSupabase()
  let query = client.from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (role) query = query.eq('role', role)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as (DbProfile & { created_at: string })[]
}

export async function updateAdminProfile(userId: string, changes: { isActive?: boolean; role?: 'customer' | 'provider' | 'admin' }) {
  const client = requireSupabase()
  const payload: Record<string, unknown> = {}
  if (changes.isActive !== undefined) payload.is_active = changes.isActive
  if (changes.role !== undefined) payload.role = changes.role
  const { data, error } = await client.from('anywork_profiles').update(payload).eq('user_id', userId).select('*').single()
  if (error) throw error
  return data as DbProfile
}

export async function uploadServiceImage(file: File) {
  const client = requireSupabase()
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Service images must be 5MB or smaller.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = 'services/' + crypto.randomUUID() + '.' + extension
  const { error } = await client.storage.from('anywork-service-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = client.storage.from('anywork-service-images').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteAdminService(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('anywork_services').delete().eq('id', id)
  if (error) throw error
}

export async function updateAdminRequestStatus(requestId: string, status: DbRequest['status']) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_requests').update({ status }).eq('id', requestId).select('*').single()
  if (error) throw error
  return data as DbRequest
}
 + Number(input.startingPrice).toLocaleString() : 'Quote'),
      image_url: input.imageUrl ?? null,
      enabled: input.enabled ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export async function updateAdminService(id: string, input: Partial<AdminServiceInput>) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_services')
    .update({
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subcategory !== undefined ? { subcategory: input.subcategory } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.items !== undefined ? { items: input.items } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.startingPrice !== undefined ? { starting_price: input.startingPrice } : {}),
      ...(input.startingPriceLabel !== undefined ? { starting_price_label: input.startingPriceLabel } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export type DbRequestPhoto = {
  id: string
  request_id: string
  customer_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  signed_url?: string
}

export type DbMessage = {
  id: string
  request_id: string | null
  sender_id: string
  receiver_id: string
  body: string
  attachment_url: string | null
  read_at: string | null
  created_at: string
}

export async function getCurrentUserId() {
  const client = requireSupabase()

  // Prefer the locally persisted session so short-lived token-refresh races do
  // not make an already authenticated workspace appear logged out.
  const sessionResult = await client.auth.getSession()
  if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user.id
  }

  // Recover once when the access token needs to be refreshed.
  const refreshed = await client.auth.refreshSession()
  if (refreshed.data.session?.user) {
    return refreshed.data.session.user.id
  }

  const userResult = await client.auth.getUser()
  if (!userResult.error && userResult.data.user) {
    return userResult.data.user.id
  }

  throw new Error('Your login session is no longer available. Please sign in again.')
}

export async function uploadRequestPhoto(requestId: string, file: File) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are supported.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Each photo must be 5 MB or smaller.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const storagePath = `${requestId}/${customerId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await client.storage
    .from('anywork-request-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await client
    .from('anywork_request_photos')
    .insert({
      request_id: requestId,
      customer_id: customerId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('*')
    .single()

  if (error) {
    await client.storage.from('anywork-request-photos').remove([storagePath])
    throw error
  }

  return data as DbRequestPhoto
}

export async function listRequestPhotos(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_photos')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  const photos = (data || []) as DbRequestPhoto[]
  if (!photos.length) return photos

  const { data: signed, error: signedError } = await client.storage
    .from('anywork-request-photos')
    .createSignedUrls(photos.map((photo) => photo.storage_path), 3600)

  if (signedError) throw signedError

  return photos.map((photo) => ({
    ...photo,
    signed_url: signed?.find((item) => item.path === photo.storage_path)?.signedUrl || undefined,
  }))
}

export async function deleteRequestPhoto(photo: DbRequestPhoto) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (photo.customer_id !== customerId) {
    throw new Error('You can only remove photos from your own requests.')
  }

  const { error: storageError } = await client.storage
    .from('anywork-request-photos')
    .remove([photo.storage_path])
  if (storageError) throw storageError

  const { error } = await client
    .from('anywork_request_photos')
    .delete()
    .eq('id', photo.id)
    .eq('customer_id', customerId)

  if (error) throw error
}

export async function createServiceRequest(input: {
  serviceKey: string
  title: string
  description: string
  location: string
  preferredDate?: string | null
  accessNotes?: string | null
  budget?: number | null
  requesterName?: string
  requesterEmail?: string
  requesterPhone?: string | null
  companyWebsite?: string
}) {
  const client = requireSupabase()

  const sessionResult = await client.auth.getSession()
  const userId = sessionResult.data.session?.user?.id

  if (!userId) {
    const { data, error } = await client.functions.invoke('create-public-request', {
      body: {
        serviceKey: input.serviceKey,
        title: input.title,
        description: input.description,
        location: input.location,
        preferredDate: input.preferredDate || null,
        accessNotes: input.accessNotes || null,
        budget: input.budget ?? null,
        requesterName: input.requesterName?.trim() || '',
        requesterEmail: input.requesterEmail?.trim() || '',
        requesterPhone: input.requesterPhone?.trim() || '',
        companyWebsite: input.companyWebsite || '',
      },
    })

    if (error) throw error
    const response = data as { request?: DbRequest; error?: string } | null
    if (!response?.request) throw new Error(response?.error || 'Unable to create this request.')
    return response.request
  }

  const { data, error } = await client
    .from('anywork_service_requests')
    .insert({
      customer_id: userId,
      requester_name: input.requesterName?.trim() || null,
      requester_email: input.requesterEmail?.trim() || sessionResult.data.session?.user?.email || null,
      requester_phone: input.requesterPhone?.trim() || null,
      service_key: input.serviceKey,
      title: input.title,
      description: input.description,
      location: input.location,
      preferred_date: input.preferredDate || null,
      access_notes: input.accessNotes || null,
      budget: input.budget ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listCustomerRequests() {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listCustomerQuotes(requestIds?: string[]) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  let query = client
    .from('anywork_quotes')
    .select('*, anywork_service_requests!inner(customer_id)')
    .eq('anywork_service_requests.customer_id', customerId)
    .order('created_at', { ascending: false })
  if (requestIds?.length) query = query.in('request_id', requestIds)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => row as unknown as DbQuote)
}

export async function getRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listQuotesForRequests(requestIds: string[]) {
  if (!requestIds.length) return [] as DbQuote[]
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .in('request_id', requestIds)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listQuotesForRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('request_id', requestId)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listProfiles(userIds: string[]) {
  if (!userIds.length) return []
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active')
    .in('user_id', userIds)

  if (error) throw error
  return (data || []) as DbProfile[]
}

export async function listProviderRequests() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listProviderQuotes() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export type DbProviderService = {
  id: string
  provider_id: string
  service_key: string
  enabled: boolean
  starting_price: number | null
  minimum_job_value: number | null
  service_area: string | null
  lead_time_days: number
  created_at: string
  updated_at: string
}

export async function listProviderServices() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbProviderService[]
}

export async function saveProviderService(input: {
  serviceKey: string
  enabled?: boolean
  startingPrice?: number | null
  minimumJobValue?: number | null
  serviceArea?: string | null
  leadTimeDays?: number
}) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .upsert({
      provider_id: providerId,
      service_key: input.serviceKey,
      enabled: input.enabled ?? true,
      starting_price: input.startingPrice ?? null,
      minimum_job_value: input.minimumJobValue ?? null,
      service_area: input.serviceArea || null,
      lead_time_days: input.leadTimeDays ?? 1,
    }, { onConflict: 'provider_id,service_key' })
    .select('*')
    .single()

  if (error) throw error
  return data as DbProviderService
}

export type CreateQuoteResult = {
  quote: DbQuote
  emailSent: boolean
  emailError?: string
}

export async function createQuote(input: {
  requestId: string
  amount: number
  availability?: string | null
  message: string
}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_create_quote', {
    p_request_id: input.requestId,
    p_amount: input.amount,
    p_availability: input.availability || null,
    p_message: input.message,
  })
  if (error) throw error

  const quote = data as DbQuote

  try {
    const { data: emailData, error: emailError } = await client.functions.invoke('send-quote-email', {
      body: { quoteId: quote.id },
    })

    if (emailError) {
      return { quote, emailSent: false, emailError: emailError.message }
    }

    const response = emailData as { sent?: boolean; error?: string } | null
    return {
      quote,
      emailSent: Boolean(response?.sent),
      emailError: response?.error,
    }
  } catch (emailError) {
    return {
      quote,
      emailSent: false,
      emailError: emailError instanceof Error ? emailError.message : 'Unable to send quote email.',
    }
  }
}

export async function retryQuoteEmail(quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('send-quote-email', {
    body: { quoteId },
  })
  if (error) throw error
  return data as { sent?: boolean; messageId?: string; recipientEmail?: string; error?: string }
}

export async function acceptQuote(requestId: string, quoteId: string, providerId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_accept_quote', {
    p_request_id: requestId,
    p_quote_id: quoteId,
  })
  if (error) throw error
  if (data?.provider_id && data.provider_id !== providerId) throw new Error('The selected quote provider no longer matches the request.')
}

export async function updateProviderJobStatus(requestId: string, status: 'In Progress' | 'Completed') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_update_job_status', {
    p_request_id: requestId,
    p_status: status,
  })
  if (error) throw error
  return data as DbRequest
}

export async function sendMessage(input: {
  requestId?: string | null
  receiverId: string
  body: string
}) {
  const client = requireSupabase()
  const senderId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_messages')
    .insert({
      request_id: input.requestId || null,
      sender_id: senderId,
      receiver_id: input.receiverId,
      body: input.body,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbMessage
}

export async function listMessages(requestId?: string | null) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  let query = client
    .from('anywork_messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true })

  if (requestId) query = query.eq('request_id', requestId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as DbMessage[]
}

export async function markMessagesRead(messageIds: string[]) {
  if (!messageIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  const { error } = await client
    .from('anywork_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('receiver_id', userId)

  if (error) throw error
}

export type DbRequestEvent = {
  id: string
  request_id: string
  event_type: string
  actor_user_id: string | null
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbNotification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  request_id: string | null
  quote_id: string | null
  message_id: string | null
  read_at: string | null
  created_at: string
}

export type GuestPortalProvider = {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  avatar_url: string | null
  city: string | null
}

export type GuestPortalResponse = {
  request: DbRequest
  quotes: DbQuote[]
  providers: GuestPortalProvider[]
  expiresAt: string
}

export async function listRequestEvents(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbRequestEvent[]
}

export async function listNotifications(limit = 30) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client
    .from('anywork_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as DbNotification[]
}

export async function markNotificationsRead(notificationIds: string[]) {
  if (!notificationIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { error } = await client
    .from('anywork_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', notificationIds)

  if (error) throw error
}

export async function subscribeToNotifications(
  onNotification: (notification: DbNotification) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbNotification
        onNotification(notification)
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestEvents(
  requestId: string,
  onEvent: (event: DbRequestEvent) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel(`anywork:request-events:${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anywork_request_events',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => onEvent(payload.new as DbRequestEvent),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export async function getGuestRequestPortal(token: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'get' },
  })

  if (error) throw error
  return data as GuestPortalResponse
}

export async function acceptGuestQuote(token: string, quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'accept_quote', quoteId },
  })

  if (error) throw error
  return data as { accepted: boolean; request: DbRequest; quote: DbQuote }
}

export type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export type DbRealtimeChange<T> = {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  record: T | null
  oldRecord: Partial<T> | null
}

export async function subscribeToRequests(
  onChange: (change: DbRealtimeChange<DbRequest>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_service_requests',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbRequest>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbRequest,
          oldRecord: payload.old as Partial<DbRequest>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToQuotes(
  onChange: (change: DbRealtimeChange<DbQuote>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:quotes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_quotes',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbQuote>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbQuote,
          oldRecord: payload.old as Partial<DbQuote>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToUserMessages(
  onMessage: (message: DbMessage) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_messages',
      },
      (payload) => {
        const message = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbMessage
        if (message.sender_id === userId || message.receiver_id === userId) {
          onMessage(message)
        }
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestMessages(
  requestId: string,
  onMessage: (message: DbMessage) => void,
) {
  return subscribeToUserMessages((message) => {
    if (message.request_id === requestId) onMessage(message)
  })
}


export type DbJobSchedule = {
  id: string
  request_id: string
  proposed_start: string | null
  proposed_end: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DbJobActivity = {
  id: string
  request_id: string
  actor_user_id: string | null
  activity_type: string
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbChangeRequest = {
  id: string
  request_id: string
  provider_id: string
  description: string
  amount_delta: number
  status: 'Pending' | 'Approved' | 'Rejected'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export async function getJobSchedule(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_schedules').select('*').eq('request_id', requestId).maybeSingle()
  if (error) throw error
  return data as DbJobSchedule | null
}

export async function confirmJobSchedule(input: { requestId: string; start: string; end?: string | null; notes?: string | null }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_confirm_schedule', {
    p_request_id: input.requestId,
    p_start: input.start,
    p_end: input.end || null,
    p_notes: input.notes || null,
  })
  if (error) throw error
  return data as DbRequest
}

export async function listJobActivities(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_activities').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as DbJobActivity[]
}

export async function listChangeRequests(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_change_requests').select('*').eq('request_id', requestId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DbChangeRequest[]
}

export async function createChangeRequest(input: { requestId: string; description: string; amountDelta: number }) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_change_requests').insert({
    request_id: input.requestId,
    provider_id: providerId,
    description: input.description,
    amount_delta: input.amountDelta,
  }).select('*').single()
  if (error) throw error
  return data as DbChangeRequest
}

export async function approveChangeRequest(changeRequestId: string, approved: boolean) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data: change, error: changeError } = await client.from('anywork_change_requests').select('*').eq('id', changeRequestId).single()
  if (changeError) throw changeError

  const { data, error } = await client.from('anywork_change_requests')
    .update({
      status: approved ? 'Approved' : 'Rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', changeRequestId)
    .eq('status', 'Pending')
    .select('*')
    .single()
  if (error) throw error

  if (approved && change.amount_delta) {
    const request = await getRequest(change.request_id)
    const currentBudget = Number(request.budget || 0)
    await client.from('anywork_service_requests').update({ budget: currentBudget + Number(change.amount_delta) }).eq('id', change.request_id)
  }
  return data as DbChangeRequest
}

export async function submitJobReview(input: { requestId: string; providerId: string; rating: number; comment?: string }) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_reviews').insert({
    request_id: input.requestId,
    customer_id: customerId,
    provider_id: input.providerId,
    rating: input.rating,
    comment: input.comment || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export type AdminOverviewStats = {
  requests: number
  openRequests: number
  completedJobs: number
  providers: number
  activeProviders: number
  customers: number
  gmv: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const client = requireSupabase()
  const [requests, providers, customers, quotes] = await Promise.all([
    client.from('anywork_service_requests').select('status, budget'),
    client.from('anywork_profiles').select('user_id, role, is_active').eq('role', 'provider'),
    client.from('anywork_profiles').select('user_id').eq('role', 'customer'),
    client.from('anywork_quotes').select('amount, status'),
  ])
  if (requests.error) throw requests.error
  if (providers.error) throw providers.error
  if (customers.error) throw customers.error
  if (quotes.error) throw quotes.error

  const requestRows = requests.data || []
  const providerRows = providers.data || []
  const customerRows = customers.data || []
  const quoteRows = quotes.data || []
  return {
    requests: requestRows.length,
    openRequests: requestRows.filter((row) => row.status !== 'Completed').length,
    completedJobs: requestRows.filter((row) => row.status === 'Completed').length,
    providers: providerRows.length,
    activeProviders: providerRows.filter((row) => row.is_active).length,
    customers: customerRows.length,
    gmv: quoteRows.filter((row) => row.status === 'Accepted').reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }
}

export async function listAdminRequests(limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listAdminProfiles(role?: 'customer' | 'provider' | 'admin', limit = 200) {
  const client = requireSupabase()
  let query = client.from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (role) query = query.eq('role', role)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as (DbProfile & { created_at: string })[]
}

export async function updateAdminProfile(userId: string, changes: { isActive?: boolean; role?: 'customer' | 'provider' | 'admin' }) {
  const client = requireSupabase()
  const payload: Record<string, unknown> = {}
  if (changes.isActive !== undefined) payload.is_active = changes.isActive
  if (changes.role !== undefined) payload.role = changes.role
  const { data, error } = await client.from('anywork_profiles').update(payload).eq('user_id', userId).select('*').single()
  if (error) throw error
  return data as DbProfile
}

export async function deleteAdminService(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('anywork_services').delete().eq('id', id)
  if (error) throw error
}

export async function updateAdminRequestStatus(requestId: string, status: DbRequest['status']) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_requests').update({ status }).eq('id', requestId).select('*').single()
  if (error) throw error
  return data as DbRequest
}
 + Number(input.startingPrice).toLocaleString() : 'Quote'),
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export async function updateAdminService(id: string, input: Partial<AdminServiceInput>) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_services')
    .update({
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subcategory !== undefined ? { subcategory: input.subcategory } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.items !== undefined ? { items: input.items } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.startingPrice !== undefined ? { starting_price: input.startingPrice } : {}),
      ...(input.startingPriceLabel !== undefined ? { starting_price_label: input.startingPriceLabel } : {}),
      ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export type DbRequestPhoto = {
  id: string
  request_id: string
  customer_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  signed_url?: string
}

export type DbMessage = {
  id: string
  request_id: string | null
  sender_id: string
  receiver_id: string
  body: string
  attachment_url: string | null
  read_at: string | null
  created_at: string
}

export async function getCurrentUserId() {
  const client = requireSupabase()

  // Prefer the locally persisted session so short-lived token-refresh races do
  // not make an already authenticated workspace appear logged out.
  const sessionResult = await client.auth.getSession()
  if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user.id
  }

  // Recover once when the access token needs to be refreshed.
  const refreshed = await client.auth.refreshSession()
  if (refreshed.data.session?.user) {
    return refreshed.data.session.user.id
  }

  const userResult = await client.auth.getUser()
  if (!userResult.error && userResult.data.user) {
    return userResult.data.user.id
  }

  throw new Error('Your login session is no longer available. Please sign in again.')
}

export async function uploadRequestPhoto(requestId: string, file: File) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are supported.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Each photo must be 5 MB or smaller.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const storagePath = `${requestId}/${customerId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await client.storage
    .from('anywork-request-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await client
    .from('anywork_request_photos')
    .insert({
      request_id: requestId,
      customer_id: customerId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('*')
    .single()

  if (error) {
    await client.storage.from('anywork-request-photos').remove([storagePath])
    throw error
  }

  return data as DbRequestPhoto
}

export async function listRequestPhotos(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_photos')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  const photos = (data || []) as DbRequestPhoto[]
  if (!photos.length) return photos

  const { data: signed, error: signedError } = await client.storage
    .from('anywork-request-photos')
    .createSignedUrls(photos.map((photo) => photo.storage_path), 3600)

  if (signedError) throw signedError

  return photos.map((photo) => ({
    ...photo,
    signed_url: signed?.find((item) => item.path === photo.storage_path)?.signedUrl || undefined,
  }))
}

export async function deleteRequestPhoto(photo: DbRequestPhoto) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (photo.customer_id !== customerId) {
    throw new Error('You can only remove photos from your own requests.')
  }

  const { error: storageError } = await client.storage
    .from('anywork-request-photos')
    .remove([photo.storage_path])
  if (storageError) throw storageError

  const { error } = await client
    .from('anywork_request_photos')
    .delete()
    .eq('id', photo.id)
    .eq('customer_id', customerId)

  if (error) throw error
}

export async function createServiceRequest(input: {
  serviceKey: string
  title: string
  description: string
  location: string
  preferredDate?: string | null
  accessNotes?: string | null
  budget?: number | null
  requesterName?: string
  requesterEmail?: string
  requesterPhone?: string | null
  companyWebsite?: string
}) {
  const client = requireSupabase()

  const sessionResult = await client.auth.getSession()
  const userId = sessionResult.data.session?.user?.id

  if (!userId) {
    const { data, error } = await client.functions.invoke('create-public-request', {
      body: {
        serviceKey: input.serviceKey,
        title: input.title,
        description: input.description,
        location: input.location,
        preferredDate: input.preferredDate || null,
        accessNotes: input.accessNotes || null,
        budget: input.budget ?? null,
        requesterName: input.requesterName?.trim() || '',
        requesterEmail: input.requesterEmail?.trim() || '',
        requesterPhone: input.requesterPhone?.trim() || '',
        companyWebsite: input.companyWebsite || '',
      },
    })

    if (error) throw error
    const response = data as { request?: DbRequest; error?: string } | null
    if (!response?.request) throw new Error(response?.error || 'Unable to create this request.')
    return response.request
  }

  const { data, error } = await client
    .from('anywork_service_requests')
    .insert({
      customer_id: userId,
      requester_name: input.requesterName?.trim() || null,
      requester_email: input.requesterEmail?.trim() || sessionResult.data.session?.user?.email || null,
      requester_phone: input.requesterPhone?.trim() || null,
      service_key: input.serviceKey,
      title: input.title,
      description: input.description,
      location: input.location,
      preferred_date: input.preferredDate || null,
      access_notes: input.accessNotes || null,
      budget: input.budget ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listCustomerRequests() {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listCustomerQuotes(requestIds?: string[]) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  let query = client
    .from('anywork_quotes')
    .select('*, anywork_service_requests!inner(customer_id)')
    .eq('anywork_service_requests.customer_id', customerId)
    .order('created_at', { ascending: false })
  if (requestIds?.length) query = query.in('request_id', requestIds)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => row as unknown as DbQuote)
}

export async function getRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listQuotesForRequests(requestIds: string[]) {
  if (!requestIds.length) return [] as DbQuote[]
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .in('request_id', requestIds)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listQuotesForRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('request_id', requestId)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listProfiles(userIds: string[]) {
  if (!userIds.length) return []
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active')
    .in('user_id', userIds)

  if (error) throw error
  return (data || []) as DbProfile[]
}

export async function listProviderRequests() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listProviderQuotes() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export type DbProviderService = {
  id: string
  provider_id: string
  service_key: string
  enabled: boolean
  starting_price: number | null
  minimum_job_value: number | null
  service_area: string | null
  lead_time_days: number
  created_at: string
  updated_at: string
}

export async function listProviderServices() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbProviderService[]
}

export async function saveProviderService(input: {
  serviceKey: string
  enabled?: boolean
  startingPrice?: number | null
  minimumJobValue?: number | null
  serviceArea?: string | null
  leadTimeDays?: number
}) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .upsert({
      provider_id: providerId,
      service_key: input.serviceKey,
      enabled: input.enabled ?? true,
      starting_price: input.startingPrice ?? null,
      minimum_job_value: input.minimumJobValue ?? null,
      service_area: input.serviceArea || null,
      lead_time_days: input.leadTimeDays ?? 1,
    }, { onConflict: 'provider_id,service_key' })
    .select('*')
    .single()

  if (error) throw error
  return data as DbProviderService
}

export type CreateQuoteResult = {
  quote: DbQuote
  emailSent: boolean
  emailError?: string
}

export async function createQuote(input: {
  requestId: string
  amount: number
  availability?: string | null
  message: string
}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_create_quote', {
    p_request_id: input.requestId,
    p_amount: input.amount,
    p_availability: input.availability || null,
    p_message: input.message,
  })
  if (error) throw error

  const quote = data as DbQuote

  try {
    const { data: emailData, error: emailError } = await client.functions.invoke('send-quote-email', {
      body: { quoteId: quote.id },
    })

    if (emailError) {
      return { quote, emailSent: false, emailError: emailError.message }
    }

    const response = emailData as { sent?: boolean; error?: string } | null
    return {
      quote,
      emailSent: Boolean(response?.sent),
      emailError: response?.error,
    }
  } catch (emailError) {
    return {
      quote,
      emailSent: false,
      emailError: emailError instanceof Error ? emailError.message : 'Unable to send quote email.',
    }
  }
}

export async function retryQuoteEmail(quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('send-quote-email', {
    body: { quoteId },
  })
  if (error) throw error
  return data as { sent?: boolean; messageId?: string; recipientEmail?: string; error?: string }
}

export async function acceptQuote(requestId: string, quoteId: string, providerId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_accept_quote', {
    p_request_id: requestId,
    p_quote_id: quoteId,
  })
  if (error) throw error
  if (data?.provider_id && data.provider_id !== providerId) throw new Error('The selected quote provider no longer matches the request.')
}

export async function updateProviderJobStatus(requestId: string, status: 'In Progress' | 'Completed') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_update_job_status', {
    p_request_id: requestId,
    p_status: status,
  })
  if (error) throw error
  return data as DbRequest
}

export async function sendMessage(input: {
  requestId?: string | null
  receiverId: string
  body: string
}) {
  const client = requireSupabase()
  const senderId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_messages')
    .insert({
      request_id: input.requestId || null,
      sender_id: senderId,
      receiver_id: input.receiverId,
      body: input.body,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbMessage
}

export async function listMessages(requestId?: string | null) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  let query = client
    .from('anywork_messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true })

  if (requestId) query = query.eq('request_id', requestId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as DbMessage[]
}

export async function markMessagesRead(messageIds: string[]) {
  if (!messageIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  const { error } = await client
    .from('anywork_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('receiver_id', userId)

  if (error) throw error
}

export type DbRequestEvent = {
  id: string
  request_id: string
  event_type: string
  actor_user_id: string | null
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbNotification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  request_id: string | null
  quote_id: string | null
  message_id: string | null
  read_at: string | null
  created_at: string
}

export type GuestPortalProvider = {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  avatar_url: string | null
  city: string | null
}

export type GuestPortalResponse = {
  request: DbRequest
  quotes: DbQuote[]
  providers: GuestPortalProvider[]
  expiresAt: string
}

export async function listRequestEvents(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbRequestEvent[]
}

export async function listNotifications(limit = 30) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client
    .from('anywork_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as DbNotification[]
}

export async function markNotificationsRead(notificationIds: string[]) {
  if (!notificationIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { error } = await client
    .from('anywork_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', notificationIds)

  if (error) throw error
}

export async function subscribeToNotifications(
  onNotification: (notification: DbNotification) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbNotification
        onNotification(notification)
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestEvents(
  requestId: string,
  onEvent: (event: DbRequestEvent) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel(`anywork:request-events:${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anywork_request_events',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => onEvent(payload.new as DbRequestEvent),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export async function getGuestRequestPortal(token: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'get' },
  })

  if (error) throw error
  return data as GuestPortalResponse
}

export async function acceptGuestQuote(token: string, quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'accept_quote', quoteId },
  })

  if (error) throw error
  return data as { accepted: boolean; request: DbRequest; quote: DbQuote }
}

export type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export type DbRealtimeChange<T> = {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  record: T | null
  oldRecord: Partial<T> | null
}

export async function subscribeToRequests(
  onChange: (change: DbRealtimeChange<DbRequest>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_service_requests',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbRequest>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbRequest,
          oldRecord: payload.old as Partial<DbRequest>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToQuotes(
  onChange: (change: DbRealtimeChange<DbQuote>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:quotes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_quotes',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbQuote>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbQuote,
          oldRecord: payload.old as Partial<DbQuote>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToUserMessages(
  onMessage: (message: DbMessage) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_messages',
      },
      (payload) => {
        const message = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbMessage
        if (message.sender_id === userId || message.receiver_id === userId) {
          onMessage(message)
        }
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestMessages(
  requestId: string,
  onMessage: (message: DbMessage) => void,
) {
  return subscribeToUserMessages((message) => {
    if (message.request_id === requestId) onMessage(message)
  })
}


export type DbJobSchedule = {
  id: string
  request_id: string
  proposed_start: string | null
  proposed_end: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DbJobActivity = {
  id: string
  request_id: string
  actor_user_id: string | null
  activity_type: string
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbChangeRequest = {
  id: string
  request_id: string
  provider_id: string
  description: string
  amount_delta: number
  status: 'Pending' | 'Approved' | 'Rejected'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export async function getJobSchedule(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_schedules').select('*').eq('request_id', requestId).maybeSingle()
  if (error) throw error
  return data as DbJobSchedule | null
}

export async function confirmJobSchedule(input: { requestId: string; start: string; end?: string | null; notes?: string | null }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_confirm_schedule', {
    p_request_id: input.requestId,
    p_start: input.start,
    p_end: input.end || null,
    p_notes: input.notes || null,
  })
  if (error) throw error
  return data as DbRequest
}

export async function listJobActivities(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_activities').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as DbJobActivity[]
}

export async function listChangeRequests(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_change_requests').select('*').eq('request_id', requestId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DbChangeRequest[]
}

export async function createChangeRequest(input: { requestId: string; description: string; amountDelta: number }) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_change_requests').insert({
    request_id: input.requestId,
    provider_id: providerId,
    description: input.description,
    amount_delta: input.amountDelta,
  }).select('*').single()
  if (error) throw error
  return data as DbChangeRequest
}

export async function approveChangeRequest(changeRequestId: string, approved: boolean) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data: change, error: changeError } = await client.from('anywork_change_requests').select('*').eq('id', changeRequestId).single()
  if (changeError) throw changeError

  const { data, error } = await client.from('anywork_change_requests')
    .update({
      status: approved ? 'Approved' : 'Rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', changeRequestId)
    .eq('status', 'Pending')
    .select('*')
    .single()
  if (error) throw error

  if (approved && change.amount_delta) {
    const request = await getRequest(change.request_id)
    const currentBudget = Number(request.budget || 0)
    await client.from('anywork_service_requests').update({ budget: currentBudget + Number(change.amount_delta) }).eq('id', change.request_id)
  }
  return data as DbChangeRequest
}

export async function submitJobReview(input: { requestId: string; providerId: string; rating: number; comment?: string }) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_reviews').insert({
    request_id: input.requestId,
    customer_id: customerId,
    provider_id: input.providerId,
    rating: input.rating,
    comment: input.comment || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export type AdminOverviewStats = {
  requests: number
  openRequests: number
  completedJobs: number
  providers: number
  activeProviders: number
  customers: number
  gmv: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const client = requireSupabase()
  const [requests, providers, customers, quotes] = await Promise.all([
    client.from('anywork_service_requests').select('status, budget'),
    client.from('anywork_profiles').select('user_id, role, is_active').eq('role', 'provider'),
    client.from('anywork_profiles').select('user_id').eq('role', 'customer'),
    client.from('anywork_quotes').select('amount, status'),
  ])
  if (requests.error) throw requests.error
  if (providers.error) throw providers.error
  if (customers.error) throw customers.error
  if (quotes.error) throw quotes.error

  const requestRows = requests.data || []
  const providerRows = providers.data || []
  const customerRows = customers.data || []
  const quoteRows = quotes.data || []
  return {
    requests: requestRows.length,
    openRequests: requestRows.filter((row) => row.status !== 'Completed').length,
    completedJobs: requestRows.filter((row) => row.status === 'Completed').length,
    providers: providerRows.length,
    activeProviders: providerRows.filter((row) => row.is_active).length,
    customers: customerRows.length,
    gmv: quoteRows.filter((row) => row.status === 'Accepted').reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }
}

export async function listAdminRequests(limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listAdminProfiles(role?: 'customer' | 'provider' | 'admin', limit = 200) {
  const client = requireSupabase()
  let query = client.from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (role) query = query.eq('role', role)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as (DbProfile & { created_at: string })[]
}

export async function updateAdminProfile(userId: string, changes: { isActive?: boolean; role?: 'customer' | 'provider' | 'admin' }) {
  const client = requireSupabase()
  const payload: Record<string, unknown> = {}
  if (changes.isActive !== undefined) payload.is_active = changes.isActive
  if (changes.role !== undefined) payload.role = changes.role
  const { data, error } = await client.from('anywork_profiles').update(payload).eq('user_id', userId).select('*').single()
  if (error) throw error
  return data as DbProfile
}

export async function uploadServiceImage(file: File) {
  const client = requireSupabase()
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Service images must be 5MB or smaller.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = 'services/' + crypto.randomUUID() + '.' + extension
  const { error } = await client.storage.from('anywork-service-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = client.storage.from('anywork-service-images').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteAdminService(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('anywork_services').delete().eq('id', id)
  if (error) throw error
}

export async function updateAdminRequestStatus(requestId: string, status: DbRequest['status']) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_requests').update({ status }).eq('id', requestId).select('*').single()
  if (error) throw error
  return data as DbRequest
}
 + Number(input.startingPrice).toLocaleString() : 'Quote'),
      image_url: input.imageUrl ?? null,
      enabled: input.enabled ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export async function updateAdminService(id: string, input: Partial<AdminServiceInput>) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_services')
    .update({
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subcategory !== undefined ? { subcategory: input.subcategory } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.items !== undefined ? { items: input.items } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.startingPrice !== undefined ? { starting_price: input.startingPrice } : {}),
      ...(input.startingPriceLabel !== undefined ? { starting_price_label: input.startingPriceLabel } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as DbService & { category: string; subcategory: string }
}

export type DbRequestPhoto = {
  id: string
  request_id: string
  customer_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  signed_url?: string
}

export type DbMessage = {
  id: string
  request_id: string | null
  sender_id: string
  receiver_id: string
  body: string
  attachment_url: string | null
  read_at: string | null
  created_at: string
}

export async function getCurrentUserId() {
  const client = requireSupabase()

  // Prefer the locally persisted session so short-lived token-refresh races do
  // not make an already authenticated workspace appear logged out.
  const sessionResult = await client.auth.getSession()
  if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user.id
  }

  // Recover once when the access token needs to be refreshed.
  const refreshed = await client.auth.refreshSession()
  if (refreshed.data.session?.user) {
    return refreshed.data.session.user.id
  }

  const userResult = await client.auth.getUser()
  if (!userResult.error && userResult.data.user) {
    return userResult.data.user.id
  }

  throw new Error('Your login session is no longer available. Please sign in again.')
}

export async function uploadRequestPhoto(requestId: string, file: File) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are supported.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Each photo must be 5 MB or smaller.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const storagePath = `${requestId}/${customerId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await client.storage
    .from('anywork-request-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await client
    .from('anywork_request_photos')
    .insert({
      request_id: requestId,
      customer_id: customerId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('*')
    .single()

  if (error) {
    await client.storage.from('anywork-request-photos').remove([storagePath])
    throw error
  }

  return data as DbRequestPhoto
}

export async function listRequestPhotos(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_photos')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  const photos = (data || []) as DbRequestPhoto[]
  if (!photos.length) return photos

  const { data: signed, error: signedError } = await client.storage
    .from('anywork-request-photos')
    .createSignedUrls(photos.map((photo) => photo.storage_path), 3600)

  if (signedError) throw signedError

  return photos.map((photo) => ({
    ...photo,
    signed_url: signed?.find((item) => item.path === photo.storage_path)?.signedUrl || undefined,
  }))
}

export async function deleteRequestPhoto(photo: DbRequestPhoto) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  if (photo.customer_id !== customerId) {
    throw new Error('You can only remove photos from your own requests.')
  }

  const { error: storageError } = await client.storage
    .from('anywork-request-photos')
    .remove([photo.storage_path])
  if (storageError) throw storageError

  const { error } = await client
    .from('anywork_request_photos')
    .delete()
    .eq('id', photo.id)
    .eq('customer_id', customerId)

  if (error) throw error
}

export async function createServiceRequest(input: {
  serviceKey: string
  title: string
  description: string
  location: string
  preferredDate?: string | null
  accessNotes?: string | null
  budget?: number | null
  requesterName?: string
  requesterEmail?: string
  requesterPhone?: string | null
  companyWebsite?: string
}) {
  const client = requireSupabase()

  const sessionResult = await client.auth.getSession()
  const userId = sessionResult.data.session?.user?.id

  if (!userId) {
    const { data, error } = await client.functions.invoke('create-public-request', {
      body: {
        serviceKey: input.serviceKey,
        title: input.title,
        description: input.description,
        location: input.location,
        preferredDate: input.preferredDate || null,
        accessNotes: input.accessNotes || null,
        budget: input.budget ?? null,
        requesterName: input.requesterName?.trim() || '',
        requesterEmail: input.requesterEmail?.trim() || '',
        requesterPhone: input.requesterPhone?.trim() || '',
        companyWebsite: input.companyWebsite || '',
      },
    })

    if (error) throw error
    const response = data as { request?: DbRequest; error?: string } | null
    if (!response?.request) throw new Error(response?.error || 'Unable to create this request.')
    return response.request
  }

  const { data, error } = await client
    .from('anywork_service_requests')
    .insert({
      customer_id: userId,
      requester_name: input.requesterName?.trim() || null,
      requester_email: input.requesterEmail?.trim() || sessionResult.data.session?.user?.email || null,
      requester_phone: input.requesterPhone?.trim() || null,
      service_key: input.serviceKey,
      title: input.title,
      description: input.description,
      location: input.location,
      preferred_date: input.preferredDate || null,
      access_notes: input.accessNotes || null,
      budget: input.budget ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listCustomerRequests() {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listCustomerQuotes(requestIds?: string[]) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  let query = client
    .from('anywork_quotes')
    .select('*, anywork_service_requests!inner(customer_id)')
    .eq('anywork_service_requests.customer_id', customerId)
    .order('created_at', { ascending: false })
  if (requestIds?.length) query = query.in('request_id', requestIds)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => row as unknown as DbQuote)
}

export async function getRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data as DbRequest
}

export async function listQuotesForRequests(requestIds: string[]) {
  if (!requestIds.length) return [] as DbQuote[]
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .in('request_id', requestIds)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listQuotesForRequest(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('request_id', requestId)
    .order('amount', { ascending: true })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export async function listProfiles(userIds: string[]) {
  if (!userIds.length) return []
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active')
    .in('user_id', userIds)

  if (error) throw error
  return (data || []) as DbProfile[]
}

export async function listProviderRequests() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listProviderQuotes() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_quotes')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DbQuote[]
}

export type DbProviderService = {
  id: string
  provider_id: string
  service_key: string
  enabled: boolean
  starting_price: number | null
  minimum_job_value: number | null
  service_area: string | null
  lead_time_days: number
  created_at: string
  updated_at: string
}

export async function listProviderServices() {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbProviderService[]
}

export async function saveProviderService(input: {
  serviceKey: string
  enabled?: boolean
  startingPrice?: number | null
  minimumJobValue?: number | null
  serviceArea?: string | null
  leadTimeDays?: number
}) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_provider_services')
    .upsert({
      provider_id: providerId,
      service_key: input.serviceKey,
      enabled: input.enabled ?? true,
      starting_price: input.startingPrice ?? null,
      minimum_job_value: input.minimumJobValue ?? null,
      service_area: input.serviceArea || null,
      lead_time_days: input.leadTimeDays ?? 1,
    }, { onConflict: 'provider_id,service_key' })
    .select('*')
    .single()

  if (error) throw error
  return data as DbProviderService
}

export type CreateQuoteResult = {
  quote: DbQuote
  emailSent: boolean
  emailError?: string
}

export async function createQuote(input: {
  requestId: string
  amount: number
  availability?: string | null
  message: string
}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_create_quote', {
    p_request_id: input.requestId,
    p_amount: input.amount,
    p_availability: input.availability || null,
    p_message: input.message,
  })
  if (error) throw error

  const quote = data as DbQuote

  try {
    const { data: emailData, error: emailError } = await client.functions.invoke('send-quote-email', {
      body: { quoteId: quote.id },
    })

    if (emailError) {
      return { quote, emailSent: false, emailError: emailError.message }
    }

    const response = emailData as { sent?: boolean; error?: string } | null
    return {
      quote,
      emailSent: Boolean(response?.sent),
      emailError: response?.error,
    }
  } catch (emailError) {
    return {
      quote,
      emailSent: false,
      emailError: emailError instanceof Error ? emailError.message : 'Unable to send quote email.',
    }
  }
}

export async function retryQuoteEmail(quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('send-quote-email', {
    body: { quoteId },
  })
  if (error) throw error
  return data as { sent?: boolean; messageId?: string; recipientEmail?: string; error?: string }
}

export async function acceptQuote(requestId: string, quoteId: string, providerId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_accept_quote', {
    p_request_id: requestId,
    p_quote_id: quoteId,
  })
  if (error) throw error
  if (data?.provider_id && data.provider_id !== providerId) throw new Error('The selected quote provider no longer matches the request.')
}

export async function updateProviderJobStatus(requestId: string, status: 'In Progress' | 'Completed') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_update_job_status', {
    p_request_id: requestId,
    p_status: status,
  })
  if (error) throw error
  return data as DbRequest
}

export async function sendMessage(input: {
  requestId?: string | null
  receiverId: string
  body: string
}) {
  const client = requireSupabase()
  const senderId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_messages')
    .insert({
      request_id: input.requestId || null,
      sender_id: senderId,
      receiver_id: input.receiverId,
      body: input.body,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbMessage
}

export async function listMessages(requestId?: string | null) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  let query = client
    .from('anywork_messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true })

  if (requestId) query = query.eq('request_id', requestId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as DbMessage[]
}

export async function markMessagesRead(messageIds: string[]) {
  if (!messageIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()

  const { error } = await client
    .from('anywork_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('receiver_id', userId)

  if (error) throw error
}

export type DbRequestEvent = {
  id: string
  request_id: string
  event_type: string
  actor_user_id: string | null
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbNotification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  request_id: string | null
  quote_id: string | null
  message_id: string | null
  read_at: string | null
  created_at: string
}

export type GuestPortalProvider = {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  avatar_url: string | null
  city: string | null
}

export type GuestPortalResponse = {
  request: DbRequest
  quotes: DbQuote[]
  providers: GuestPortalProvider[]
  expiresAt: string
}

export async function listRequestEvents(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as DbRequestEvent[]
}

export async function listNotifications(limit = 30) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data, error } = await client
    .from('anywork_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as DbNotification[]
}

export async function markNotificationsRead(notificationIds: string[]) {
  if (!notificationIds.length) return
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { error } = await client
    .from('anywork_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', notificationIds)

  if (error) throw error
}

export async function subscribeToNotifications(
  onNotification: (notification: DbNotification) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbNotification
        onNotification(notification)
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestEvents(
  requestId: string,
  onEvent: (event: DbRequestEvent) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel(`anywork:request-events:${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anywork_request_events',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => onEvent(payload.new as DbRequestEvent),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export async function getGuestRequestPortal(token: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'get' },
  })

  if (error) throw error
  return data as GuestPortalResponse
}

export async function acceptGuestQuote(token: string, quoteId: string) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('guest-request-portal', {
    body: { token, action: 'accept_quote', quoteId },
  })

  if (error) throw error
  return data as { accepted: boolean; request: DbRequest; quote: DbQuote }
}

export type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export type DbRealtimeChange<T> = {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  record: T | null
  oldRecord: Partial<T> | null
}

export async function subscribeToRequests(
  onChange: (change: DbRealtimeChange<DbRequest>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_service_requests',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbRequest>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbRequest,
          oldRecord: payload.old as Partial<DbRequest>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToQuotes(
  onChange: (change: DbRealtimeChange<DbQuote>) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel('anywork:quotes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_quotes',
      },
      (payload) => {
        onChange({
          event: payload.eventType as DbRealtimeChange<DbQuote>['event'],
          record: payload.eventType === 'DELETE' ? null : payload.new as DbQuote,
          oldRecord: payload.old as Partial<DbQuote>,
        })
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToUserMessages(
  onMessage: (message: DbMessage) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const channel = client
    .channel(`anywork:user-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anywork_messages',
      },
      (payload) => {
        const message = (payload.eventType === 'DELETE' ? payload.old : payload.new) as DbMessage
        if (message.sender_id === userId || message.receiver_id === userId) {
          onMessage(message)
        }
      },
    )
    .subscribe((status) => onStatus?.(status as RealtimeStatus))

  return () => {
    void client.removeChannel(channel)
  }
}

export async function subscribeToRequestMessages(
  requestId: string,
  onMessage: (message: DbMessage) => void,
) {
  return subscribeToUserMessages((message) => {
    if (message.request_id === requestId) onMessage(message)
  })
}


export type DbJobSchedule = {
  id: string
  request_id: string
  proposed_start: string | null
  proposed_end: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DbJobActivity = {
  id: string
  request_id: string
  actor_user_id: string | null
  activity_type: string
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type DbChangeRequest = {
  id: string
  request_id: string
  provider_id: string
  description: string
  amount_delta: number
  status: 'Pending' | 'Approved' | 'Rejected'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export async function getJobSchedule(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_schedules').select('*').eq('request_id', requestId).maybeSingle()
  if (error) throw error
  return data as DbJobSchedule | null
}

export async function confirmJobSchedule(input: { requestId: string; start: string; end?: string | null; notes?: string | null }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('anywork_confirm_schedule', {
    p_request_id: input.requestId,
    p_start: input.start,
    p_end: input.end || null,
    p_notes: input.notes || null,
  })
  if (error) throw error
  return data as DbRequest
}

export async function listJobActivities(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_job_activities').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as DbJobActivity[]
}

export async function listChangeRequests(requestId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_change_requests').select('*').eq('request_id', requestId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DbChangeRequest[]
}

export async function createChangeRequest(input: { requestId: string; description: string; amountDelta: number }) {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_change_requests').insert({
    request_id: input.requestId,
    provider_id: providerId,
    description: input.description,
    amount_delta: input.amountDelta,
  }).select('*').single()
  if (error) throw error
  return data as DbChangeRequest
}

export async function approveChangeRequest(changeRequestId: string, approved: boolean) {
  const client = requireSupabase()
  const userId = await getCurrentUserId()
  const { data: change, error: changeError } = await client.from('anywork_change_requests').select('*').eq('id', changeRequestId).single()
  if (changeError) throw changeError

  const { data, error } = await client.from('anywork_change_requests')
    .update({
      status: approved ? 'Approved' : 'Rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', changeRequestId)
    .eq('status', 'Pending')
    .select('*')
    .single()
  if (error) throw error

  if (approved && change.amount_delta) {
    const request = await getRequest(change.request_id)
    const currentBudget = Number(request.budget || 0)
    await client.from('anywork_service_requests').update({ budget: currentBudget + Number(change.amount_delta) }).eq('id', change.request_id)
  }
  return data as DbChangeRequest
}

export async function submitJobReview(input: { requestId: string; providerId: string; rating: number; comment?: string }) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()
  const { data, error } = await client.from('anywork_reviews').insert({
    request_id: input.requestId,
    customer_id: customerId,
    provider_id: input.providerId,
    rating: input.rating,
    comment: input.comment || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export type AdminOverviewStats = {
  requests: number
  openRequests: number
  completedJobs: number
  providers: number
  activeProviders: number
  customers: number
  gmv: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const client = requireSupabase()
  const [requests, providers, customers, quotes] = await Promise.all([
    client.from('anywork_service_requests').select('status, budget'),
    client.from('anywork_profiles').select('user_id, role, is_active').eq('role', 'provider'),
    client.from('anywork_profiles').select('user_id').eq('role', 'customer'),
    client.from('anywork_quotes').select('amount, status'),
  ])
  if (requests.error) throw requests.error
  if (providers.error) throw providers.error
  if (customers.error) throw customers.error
  if (quotes.error) throw quotes.error

  const requestRows = requests.data || []
  const providerRows = providers.data || []
  const customerRows = customers.data || []
  const quoteRows = quotes.data || []
  return {
    requests: requestRows.length,
    openRequests: requestRows.filter((row) => row.status !== 'Completed').length,
    completedJobs: requestRows.filter((row) => row.status === 'Completed').length,
    providers: providerRows.length,
    activeProviders: providerRows.filter((row) => row.is_active).length,
    customers: customerRows.length,
    gmv: quoteRows.filter((row) => row.status === 'Accepted').reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }
}

export async function listAdminRequests(limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anywork_service_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as DbRequest[]
}

export async function listAdminProfiles(role?: 'customer' | 'provider' | 'admin', limit = 200) {
  const client = requireSupabase()
  let query = client.from('anywork_profiles')
    .select('user_id, role, first_name, last_name, display_name, company_name, avatar_url, city, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (role) query = query.eq('role', role)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as (DbProfile & { created_at: string })[]
}

export async function updateAdminProfile(userId: string, changes: { isActive?: boolean; role?: 'customer' | 'provider' | 'admin' }) {
  const client = requireSupabase()
  const payload: Record<string, unknown> = {}
  if (changes.isActive !== undefined) payload.is_active = changes.isActive
  if (changes.role !== undefined) payload.role = changes.role
  const { data, error } = await client.from('anywork_profiles').update(payload).eq('user_id', userId).select('*').single()
  if (error) throw error
  return data as DbProfile
}

export async function deleteAdminService(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('anywork_services').delete().eq('id', id)
  if (error) throw error
}

export async function updateAdminRequestStatus(requestId: string, status: DbRequest['status']) {
  const client = requireSupabase()
  const { data, error } = await client.from('anywork_service_requests').update({ status }).eq('id', requestId).select('*').single()
  if (error) throw error
  return data as DbRequest
}
