import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCheck,
  ChevronLeft,
  FileText,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Radio,
  ShieldCheck,
  Smile,
} from 'lucide-react'
import {
  getCurrentUserId,
  listMessages,
  listProfiles,
  markMessagesRead,
  sendMessage,
  subscribeToUserMessages,
  type DbMessage,
  type DbProfile,
} from '../lib/anyworkApi'

type Conversation = {
  id: string
  counterpartId: string
  name: string
  subtitle: string
  requestId: string | null
  status: string
  initials: string
  unread: number
  lastMessage: string
  time: string
  messages: DbMessage[]
}

const initialsFrom = (profile?: DbProfile) => {
  const value = profile?.display_name || profile?.company_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'ANYwork'
  return value.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

const displayName = (profile?: DbProfile) =>
  profile?.company_name || profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'ANYwork user'

export function CustomerMessagesPage({
  onNavigate,
  requestId,
  providerId,
  workspaceRole = 'customer',
}: {
  onNavigate: (path: string) => void
  requestId?: string
  providerId?: string
  workspaceRole?: 'customer' | 'provider'
}) {
  const [currentUserId, setCurrentUserId] = useState('')
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [profiles, setProfiles] = useState<DbProfile[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtime, setRealtime] = useState<'connecting' | 'live' | 'offline'>('connecting')
  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const lastLoadedAtRef = useRef(0)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [userId, rows] = await Promise.all([getCurrentUserId(), listMessages(requestId)])
      setCurrentUserId(userId)
      setMessages(rows)
      const participantIds = Array.from(new Set(rows.flatMap((message) => [message.sender_id, message.receiver_id]).filter((id) => id !== userId)))
      if (providerId) participantIds.push(providerId)
      const uniqueIds = Array.from(new Set(participantIds))
      setProfiles(await listProfiles(uniqueIds))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load().then(() => { lastLoadedAtRef.current = Date.now() }).catch(() => undefined) }, [requestId, providerId])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastLoadedAtRef.current < 1500) return
      void load().then(() => { lastLoadedAtRef.current = Date.now() }).catch(() => undefined)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
    }
  }, [requestId, providerId])

  useEffect(() => {
    if (!currentUserId) return
    let cleanup: (() => void) | undefined
    void subscribeToUserMessages((message) => {
      if (requestId && message.request_id !== requestId) return
      setMessages((current) => {
        const existing = current.findIndex((item) => item.id === message.id)
        if (existing === -1) return [...current, message]
        const next = [...current]
        next[existing] = message
        return next
      })
      const otherId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id
      void listProfiles([otherId]).then((rows) => {
        if (rows.length) {
          setProfiles((current) => [...current.filter((item) => item.user_id !== otherId), ...rows])
        }
      }).catch(() => undefined)
    }, (status) => {
      setRealtime(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' ? 'offline' : 'connecting')
    }).then((dispose) => { cleanup = dispose }).catch(() => setRealtime('offline'))
    return () => cleanup?.()
  }, [requestId, currentUserId])

  const conversationMap = useMemo(() => {
    const map = new Map<string, Conversation>()
    for (const message of messages) {
      const otherId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id
      const existing = map.get(otherId)
      const profile = profiles.find((item) => item.user_id === otherId)
      const messageList = existing ? [...existing.messages, message] : [message]
      const unread = messageList.filter((item) => item.receiver_id === currentUserId && !item.read_at).length
      map.set(otherId, {
        id: otherId,
        counterpartId: otherId,
        name: displayName(profile),
        subtitle: requestId ? 'Connected to this request' : (profile?.city || 'ANYwork conversation'),
        requestId: requestId || message.request_id,
        status: requestId ? 'Request conversation' : 'Active',
        initials: initialsFrom(profile),
        unread,
        lastMessage: messageList[messageList.length - 1]?.body || '',
        time: new Date(messageList[messageList.length - 1]?.created_at || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        messages: messageList,
      })
    }
    if (providerId && !map.has(providerId)) {
      const profile = profiles.find((item) => item.user_id === providerId)
      map.set(providerId, {
        id: providerId,
        counterpartId: providerId,
        name: displayName(profile),
        subtitle: 'Provider conversation',
        requestId: requestId || null,
        status: 'Ready to message',
        initials: initialsFrom(profile),
        unread: 0,
        lastMessage: 'Start the conversation about this request.',
        time: '',
        messages: [],
      })
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.messages.at(-1)?.created_at || 0).getTime() - new Date(a.messages.at(-1)?.created_at || 0).getTime())
  }, [messages, profiles, currentUserId, requestId, providerId])

  const filtered = conversationMap.filter((conversation) => (conversation.name + ' ' + conversation.lastMessage).toLowerCase().includes(query.toLowerCase()))
  const selected = filtered.find((conversation) => conversation.id === selectedKey)
    || conversationMap.find((conversation) => conversation.id === providerId)
    || filtered[0]
    || conversationMap[0]

  useEffect(() => {
    if (selected && selected.id !== selectedKey) setSelectedKey(selected.id)
  }, [selected, selectedKey])

  const selectedProfile = profiles.find((profile) => profile.user_id === selected?.counterpartId)

  const send = async () => {
    const text = draft.trim()
    if (!text || !selected) return
    try {
      const message = await sendMessage({ requestId: requestId || selected.requestId, receiverId: selected.counterpartId, body: text })
      setMessages((current) => [...current, message])
      setDraft('')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the message.')
    }
  }

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [selected?.id, selected?.messages.length])

  useEffect(() => {
    const unread = messages.filter((message) => (
      message.receiver_id === currentUserId
      && !message.read_at
      && (!requestId || message.request_id === requestId)
    )).map((message) => message.id)
    if (unread.length) void markMessagesRead(unread).catch(() => undefined)
  }, [messages, currentUserId, requestId])

  return (
    <div className={"workspaceDashboard messagesPage messagesPage-" + workspaceRole}>
      <div className="messagesPageHeader">
        <div>
          <span className="eyebrow">MESSAGES</span>
          <h1>{workspaceRole === 'provider' ? 'Customer conversations' : 'Conversations'}</h1>
          <p>{workspaceRole === 'provider' ? 'Keep every customer conversation attached to its request and job.' : 'Keep provider and support conversations connected to the work.'}</p>
        </div>
        <div className="messagesHeaderStatus">
          <span className={'messagesRealtimeStatus ' + realtime}>
            <Radio size={13} /> {realtime === 'live' ? 'Live updates' : realtime === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          </span>
          <span className="messagesSecurityStatus"><ShieldCheck size={16} /> Secure work conversations</span>
        </div>
      </div>

      {error && <div className="formError messagesError">{error}</div>}

      <div className="messagesShell">
        <aside className="messagesInbox">
          <div className="messagesInboxTop"><strong>Inbox</strong><span>{conversationMap.reduce((total, item) => total + item.unread, 0)} unread</span></div>
          <div className="messagesSearch"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations..." /></div>
          <div className="messagesConversationList">
            {loading && <div className="messagesEmptyState">Loading conversations…</div>}
            {!loading && !filtered.length && <div className="messagesEmptyState">No conversations yet.</div>}
            {filtered.map((conversation) => (
              <button key={conversation.id} className={'messagesConversationItem ' + (selected?.id === conversation.id ? 'active' : '')} onClick={() => setSelectedKey(conversation.id)}>
                <span className="conversationAvatar">{conversation.initials}</span>
                <span className="conversationCopy">
                  <span className="conversationTop"><strong>{conversation.name}</strong><small>{conversation.time}</small></span>
                  <span className="conversationSub">{conversation.subtitle}</span>
                  <span className="conversationPreview">{conversation.lastMessage}</span>
                </span>
                {conversation.unread > 0 && <b className="conversationUnread">{conversation.unread}</b>}
              </button>
            ))}
          </div>
        </aside>

        <section className="messageThread">
          <header className="messageThreadHeader">
            <div className="messageThreadIdentity">
              <button className="messagesMobileBack" aria-label="Back" onClick={() => onNavigate(requestId ? '/' + workspaceRole + '/requests/' + requestId : '/' + workspaceRole + '/messages')}><ChevronLeft size={18} /></button>
              <span className="conversationAvatar large">{selected?.initials || initialsFrom(selectedProfile)}</span>
              <div><strong>{selected?.name || 'Select a conversation'}</strong><span>{selected?.subtitle || 'Choose a conversation to begin.'}</span></div>
            </div>
            <div className="messageThreadActions">
              <span className="threadStatus"><span /> {selected?.status || 'Waiting'}</span>
              <button aria-label="Conversation options"><MoreHorizontal size={18} /></button>
            </div>
          </header>

          {selected?.requestId && (
            <div className="messageRequestContext">
              <div className="messageRequestIcon"><FileText size={17} /></div>
              <div><span>CONNECTED REQUEST</span><strong>{selected.requestId}</strong></div>
              <button onClick={() => onNavigate('/' + workspaceRole + '/requests/' + selected.requestId)} type="button">View request</button>
            </div>
          )}

          <div className="messageThreadBody">
            <div className="messageDateDivider"><span>Conversation</span></div>
            {selected?.messages.map((message, index) => (

              <div key={message.id} className={'messageRow ' + (message.sender_id === currentUserId ? 'me' : 'them') + (selected.messages[index - 1]?.sender_id === message.sender_id ? ' grouped' : '')}>
                <div className="messageBubble">
                  <p>{message.body}</p>
                  <span>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {message.sender_id === currentUserId && <CheckCheck size={12} />}</span>
                </div>
              </div>
            ))}
            {!selected?.messages.length && <div className="messageEmptyConversation"><strong>Start the conversation</strong><span>Send a clear question or update about this request.</span></div>}
            <div ref={threadEndRef} />
          </div>

          <div className="messageComposer">
            <div className="composerTools"><button aria-label="Attach file" type="button"><Paperclip size={17} /></button><button aria-label="Add emoji" type="button"><Smile size={17} /></button></div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }}
              placeholder={selected ? 'Write a professional message...' : 'Select a conversation first'}
              rows={1}
              disabled={!selected}
            />
            <button className="messageSendButton" onClick={() => void send()} disabled={!selected || !draft.trim()} aria-label="Send message"><Send size={17} /></button>
          </div>
          <small className="messageComposerNote">Press Enter to send · Shift + Enter for a new line</small>
        </section>
      </div>
    </div>
  )
}
