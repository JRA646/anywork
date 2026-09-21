import { useMemo, useState } from 'react'
import {
  CheckCheck,
  ChevronLeft,
  FileText,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Smile,
} from 'lucide-react'

type Conversation = {
  id: string
  name: string
  subtitle: string
  requestId: string
  status: string
  initials: string
  unread: number
  lastMessage: string
  time: string
  messages: {
    id: number
    from: 'them' | 'me'
    text: string
    time: string
    read?: boolean
  }[]
}

const seedConversations: Conversation[] = [
  {
    id: 'signal',
    name: 'Signal Works',
    subtitle: 'Commercial signage · Parramatta',
    requestId: 'AW-1027',
    status: 'Quoted',
    initials: 'SW',
    unread: 2,
    lastMessage: 'We can move the installation to 10:00 AM.',
    time: '10:42 AM',
    messages: [
      { id: 1, from: 'them', text: 'Hi John, we have reviewed the requirements for the commercial banner.', time: '10:24 AM' },
      { id: 2, from: 'me', text: 'Thanks. Can we move the appointment to 10:00 AM?', time: '10:31 AM', read: true },
      { id: 3, from: 'them', text: 'Absolutely. We can move the installation to 10:00 AM.', time: '10:42 AM' },
    ],
  },
  {
    id: 'northside',
    name: 'Northside Fabrication',
    subtitle: 'Office furniture assembly · North Sydney',
    requestId: 'AW-1026',
    status: 'Scheduled',
    initials: 'NF',
    unread: 0,
    lastMessage: 'Everything is confirmed for Friday.',
    time: 'Yesterday',
    messages: [
      { id: 1, from: 'them', text: 'Everything is confirmed for Friday at 9:00 AM.', time: 'Yesterday · 4:18 PM' },
      { id: 2, from: 'me', text: 'Perfect. We will have the reception area ready.', time: 'Yesterday · 4:25 PM', read: true },
    ],
  },
  {
    id: 'support',
    name: 'ANYwork Support',
    subtitle: 'Marketplace support',
    requestId: 'HELP',
    status: 'Support',
    initials: 'AW',
    unread: 1,
    lastMessage: 'We can help review the request with you.',
    time: 'Mon',
    messages: [
      { id: 1, from: 'them', text: 'Welcome to ANYwork support. How can we help?', time: 'Mon · 9:10 AM' },
      { id: 2, from: 'me', text: 'I have a question about my request status.', time: 'Mon · 9:18 AM', read: true },
      { id: 3, from: 'them', text: 'We can help review the request with you.', time: 'Mon · 9:22 AM' },
    ],
  },
]

export function CustomerMessagesPage({ onNavigate, requestId }: { onNavigate: (path: string) => void; requestId?: string }) {
  const initialConversation = requestId
    ? seedConversations.find((conversation) => conversation.requestId === requestId) || seedConversations[0]
    : seedConversations[0]
  const [conversations, setConversations] = useState(seedConversations)
  const [selectedId, setSelectedId] = useState(initialConversation.id)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')

  const selected = conversations.find((conversation) => conversation.id === selectedId) || conversations[0]
  const filtered = useMemo(
    () => conversations.filter((conversation) => (conversation.name + ' ' + conversation.lastMessage).toLowerCase().includes(query.toLowerCase())),
    [conversations, query],
  )

  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return

    setConversations((current) => current.map((conversation) => {
      if (conversation.id !== selected.id) return conversation
      return {
        ...conversation,
        unread: 0,
        lastMessage: text,
        time: 'Just now',
        messages: [
          ...conversation.messages,
          { id: Date.now(), from: 'me', text, time: 'Just now', read: true },
        ],
      }
    }))
    setDraft('')
  }

  return (
    <div className="workspaceDashboard messagesPage">
      <div className="messagesPageHeader">
        <div>
          <span className="eyebrow">MESSAGES</span>
          <h1>Conversations</h1>
          <p>Keep every customer, provider and support conversation connected to the work.</p>
        </div>
        <div className="messagesHeaderStatus">
          <ShieldCheck size={16} />
          Secure work conversations
        </div>
      </div>

      <div className="messagesShell">
        <aside className="messagesInbox">
          <div className="messagesInboxTop">
            <strong>Inbox</strong>
            <span>{conversations.reduce((total, item) => total + item.unread, 0)} unread</span>
          </div>
          <div className="messagesSearch">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations..." />
          </div>
          <div className="messagesConversationList">
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                className={'messagesConversationItem ' + (selected.id === conversation.id ? 'active' : '')}
                onClick={() => setSelectedId(conversation.id)}
              >
                <span className="conversationAvatar">{conversation.initials}</span>
                <span className="conversationCopy">
                  <span className="conversationTop">
                    <strong>{conversation.name}</strong>
                    <small>{conversation.time}</small>
                  </span>
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
              <button className="messagesMobileBack" aria-label="Back"><ChevronLeft size={18} /></button>
              <span className="conversationAvatar large">{selected.initials}</span>
              <div>
                <strong>{selected.name}</strong>
                <span>{selected.subtitle}</span>
              </div>
            </div>
            <div className="messageThreadActions">
              <span className="threadStatus"><span /> {selected.status}</span>
              <button aria-label="Conversation options"><MoreHorizontal size={18} /></button>
            </div>
          </header>

          <div className="messageRequestContext">
            <div className="messageRequestIcon"><FileText size={17} /></div>
            <div>
              <span>CONNECTED REQUEST</span>
              <strong>{selected.requestId === 'HELP' ? 'ANYwork Support' : selected.requestId + ' · ' + selected.name}</strong>
            </div>
            {selected.requestId !== 'HELP' && <button onClick={() => onNavigate('/customer/requests/' + selected.requestId)} type="button">View request</button>}
          </div>

          <div className="messageThreadBody">
            <div className="messageDateDivider"><span>Conversation</span></div>
            {selected.messages.map((message) => (
              <div key={message.id} className={'messageRow ' + message.from}>
                <div className="messageBubble">
                  <p>{message.text}</p>
                  <span>{message.time} {message.from === 'me' && <CheckCheck size={12} />}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="messageComposer">
            <div className="composerTools">
              <button aria-label="Attach file"><Paperclip size={17} /></button>
              <button aria-label="Add emoji"><Smile size={17} /></button>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Write a professional message..."
              rows={1}
            />
            <button className="messageSendButton" onClick={sendMessage} disabled={!draft.trim()} aria-label="Send message">
              <Send size={17} />
            </button>
          </div>
          <small className="messageComposerNote">Press Enter to send · Shift + Enter for a new line</small>
        </section>
      </div>
    </div>
  )
}
