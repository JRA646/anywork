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

export async function subscribeToRequestMessages(
  requestId: string,
  onMessage: (message: DbMessage) => void,
) {
  const client = requireSupabase()
  const channel = client
    .channel(`request:${requestId}:messages`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anywork_messages',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => onMessage(payload.new as DbMessage),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
