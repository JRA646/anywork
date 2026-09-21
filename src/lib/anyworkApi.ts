import { requireSupabase } from './supabase'

export type DbRequest = {
  id: string
  request_number: string
  customer_id: string
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
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in.')
  return data.user.id
}

export async function createServiceRequest(input: {
  serviceKey: string
  title: string
  description: string
  location: string
  preferredDate?: string | null
  accessNotes?: string | null
  budget?: number | null
}) {
  const client = requireSupabase()
  const customerId = await getCurrentUserId()

  const { data, error } = await client
    .from('anywork_service_requests')
    .insert({
      customer_id: customerId,
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

  return data as DbQuote
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
