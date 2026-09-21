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
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_quotes')
    .insert({
      request_id: input.requestId,
      provider_id: providerId,
      amount: input.amount,
      availability: input.availability || null,
      message: input.message,
      status: 'Pending',
    })
    .select('*')
    .single()

  if (error) throw error

  await client
    .from('anywork_service_requests')
    .update({ status: 'Quoted' })
    .eq('id', input.requestId)

  try {
    const { data: emailData, error: emailError } = await client.functions.invoke('send-quote-email', {
      body: { quoteId: data.id },
    })

    if (emailError) {
      return { quote: data as DbQuote, emailSent: false, emailError: emailError.message }
    }

    const response = emailData as { sent?: boolean; error?: string } | null
    return {
      quote: data as DbQuote,
      emailSent: Boolean(response?.sent),
      emailError: response?.error,
    }
  } catch (emailError) {
    return {
      quote: data as DbQuote,
      emailSent: false,
      emailError: emailError instanceof Error ? emailError.message : 'Unable to send quote email.',
    }
  }
}

export async function acceptQuote(requestId: string, quoteId: string, providerId: string) {
  const client = requireSupabase()

  const { error: quoteError } = await client
    .from('anywork_quotes')
    .update({ status: 'Declined' })
    .eq('request_id', requestId)

  if (quoteError) throw quoteError

  const { error: acceptedError } = await client
    .from('anywork_quotes')
    .update({ status: 'Accepted' })
    .eq('id', quoteId)
    .eq('request_id', requestId)

  if (acceptedError) throw acceptedError

  const { error: requestError } = await client
    .from('anywork_service_requests')
    .update({
      selected_provider_id: providerId,
      status: 'Quoted',
    })
    .eq('id', requestId)

  if (requestError) throw requestError
}

export async function updateProviderJobStatus(requestId: string, status: 'In Progress' | 'Completed') {
  const client = requireSupabase()
  const providerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_service_requests')
    .update({ status })
    .eq('id', requestId)
    .eq('selected_provider_id', providerId)
    .select('*')
    .single()

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
