'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Message = {
  id: string
  body: string
  type: 'seek' | 'offer'
  time_ago: string
  created_at: string
  fresh?: boolean
}

type ConnectState =
  | { status: 'idle' }
  | { status: 'open' }
  | { status: 'loading' }
  | { status: 'connected'; message: string }
  | { status: 'redirected'; message: string; suggestions: Message[] }
  | { status: 'waiting'; message: string }
  | { status: 'rate_limited' }
  | { status: 'error'; message: string }

function wordCount(s: string) {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length
}

function Card({
  msg,
  onPostFirst,
}: {
  msg: Message
  onPostFirst: () => void
}) {
  const isSeek = msg.type === 'seek'
  const [connect, setConnect] = useState<ConnectState>({ status: 'idle' })
  const [email, setEmail] = useState('')

  async function handleConnect() {
    if (!email || !email.includes('@')) return
    setConnect({ status: 'loading' })

    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_email: email, target_message_id: msg.id }),
    })
    const data = await res.json()

    if (res.status === 429) {
      setConnect({ status: 'rate_limited' })
    } else if (!res.ok) {
      setConnect({ status: 'error', message: data.error })
    } else if (data.outcome === 'connected') {
      setConnect({ status: 'connected', message: data.message })
    } else if (data.outcome === 'redirected') {
      setConnect({ status: 'redirected', message: data.message, suggestions: data.suggestions })
    } else if (data.outcome === 'waiting') {
      setConnect({ status: 'waiting', message: data.message })
    }
  }

  const cardStyle = isSeek
    ? 'bg-[#F5C400] border-2 border-black text-black'
    : 'bg-black border-2 border-[#F5C400] text-[#F5C400]'

  const labelStyle = isSeek ? 'text-black/50' : 'text-[#F5C400]/50'
  const timeStyle = isSeek ? 'text-black/40' : 'text-[#F5C400]/40'

  const btnStyle = isSeek
    ? 'border border-black text-black text-xs px-3 py-1 hover:bg-black hover:text-[#F5C400] transition-colors'
    : 'border border-[#F5C400] text-[#F5C400] text-xs px-3 py-1 hover:bg-[#F5C400] hover:text-black transition-colors'

  const inputStyle = isSeek
    ? 'bg-black/10 border border-black/30 text-black placeholder:text-black/40 text-xs px-2 py-1.5 w-full outline-none focus:border-black'
    : 'bg-white/5 border border-[#F5C400]/30 text-[#F5C400] placeholder:text-[#F5C400]/40 text-xs px-2 py-1.5 w-full outline-none focus:border-[#F5C400]'

  return (
    <div className={`${cardStyle} p-3 ${msg.fresh ? 'animate-fadein' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] uppercase tracking-widest font-semibold ${labelStyle}`}>
          {isSeek ? 'seeking' : 'offering'}
        </span>
        <span className={`text-[10px] ${timeStyle}`}>{msg.time_ago}</span>
      </div>

      <p className="text-sm leading-relaxed mb-3">{msg.body}</p>

      {connect.status === 'idle' && (
        <button className={btnStyle} onClick={() => setConnect({ status: 'open' })}>
          Connect →
        </button>
      )}

      {connect.status === 'open' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            type="email"
            placeholder="your@email.com to connect"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyle}
          />
          <button
            className={`${btnStyle} w-full text-center`}
            onClick={handleConnect}
          >
            send request →
          </button>
        </div>
      )}

      {connect.status === 'loading' && (
        <p className={`text-[11px] ${labelStyle} mt-2`}>sending…</p>
      )}

      {connect.status === 'connected' && (
        <p className={`text-[11px] font-medium mt-2 ${isSeek ? 'text-black' : 'text-[#F5C400]'}`}>
          {connect.message}
        </p>
      )}

      {connect.status === 'rate_limited' && (
        <p className={`text-[11px] mt-2 ${labelStyle}`}>
          One connection per 24 hours. Come back tomorrow.
        </p>
      )}

      {connect.status === 'error' && (
        <p className="text-[11px] mt-2 text-red-500">{connect.message}</p>
      )}

      {connect.status === 'waiting' && (
        <div className="mt-2">
          <p className={`text-[11px] ${labelStyle} mb-1`}>
            Post your own message first — it helps us find your closest match.
          </p>
          <button
            className={`text-[11px] underline ${isSeek ? 'text-black' : 'text-[#F5C400]'}`}
            onClick={onPostFirst}
          >
            post yours →
          </button>
        </div>
      )}

      {connect.status === 'redirected' && (
        <div className="mt-2">
          <p className={`text-[11px] mb-2 ${labelStyle}`}>{connect.message}</p>
          <div className="flex flex-col gap-2">
            {connect.suggestions.map((s) => (
              <MiniCard key={s.id} msg={s} onPostFirst={onPostFirst} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniCard({ msg, onPostFirst }: { msg: Message; onPostFirst: () => void }) {
  const isSeek = msg.type === 'seek'
  const [connect, setConnect] = useState<ConnectState>({ status: 'idle' })
  const [email, setEmail] = useState('')

  async function handleConnect() {
    if (!email || !email.includes('@')) return
    setConnect({ status: 'loading' })
    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_email: email, target_message_id: msg.id }),
    })
    const data = await res.json()
    if (res.status === 429) setConnect({ status: 'rate_limited' })
    else if (!res.ok) setConnect({ status: 'error', message: data.error })
    else if (data.outcome === 'connected') setConnect({ status: 'connected', message: data.message })
    else if (data.outcome === 'waiting') setConnect({ status: 'waiting', message: data.message })
    else setConnect({ status: 'redirected', message: data.message, suggestions: [] })
  }

  const cardStyle = isSeek
    ? 'bg-[#F5C400]/80 border border-black text-black'
    : 'bg-black/80 border border-[#F5C400] text-[#F5C400]'

  const btnStyle = isSeek
    ? 'border border-black text-black text-[10px] px-2 py-0.5 hover:bg-black hover:text-[#F5C400] transition-colors'
    : 'border border-[#F5C400] text-[#F5C400] text-[10px] px-2 py-0.5 hover:bg-[#F5C400] hover:text-black transition-colors'

  const inputStyle = isSeek
    ? 'bg-black/10 border border-black/30 text-black placeholder:text-black/40 text-[10px] px-2 py-1 w-full outline-none'
    : 'bg-white/5 border border-[#F5C400]/30 text-[#F5C400] placeholder:text-[#F5C400]/40 text-[10px] px-2 py-1 w-full outline-none'

  return (
    <div className={`${cardStyle} p-2`}>
      <p className="text-[11px] leading-relaxed mb-1.5">{msg.body}</p>
      {connect.status === 'idle' && (
        <button className={btnStyle} onClick={() => setConnect({ status: 'open' })}>Connect →</button>
      )}
      {connect.status === 'open' && (
        <div className="flex gap-1">
          <input type="email" placeholder="your@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputStyle} />
          <button className={btnStyle} onClick={handleConnect}>→</button>
        </div>
      )}
      {connect.status === 'loading' && <p className="text-[10px] opacity-50">sending…</p>}
      {connect.status === 'connected' && <p className="text-[10px] font-medium">{connect.message}</p>}
      {connect.status === 'rate_limited' && <p className="text-[10px] opacity-50">One connection per 24h.</p>}
      {connect.status === 'waiting' && (
        <button className="text-[10px] underline opacity-70" onClick={onPostFirst}>post yours first →</button>
      )}
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [email, setEmail] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const composeRef = useRef<HTMLTextAreaElement>(null)

  const wc = wordCount(body)
  const canPost = wc > 0 && wc <= 24 && email.includes('@') && !posting

  useEffect(() => {
    // Initial load
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))

    // Realtime subscription
    const channel = supabase
      .channel('messages-board')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [{ ...newMsg, time_ago: 'just now', fresh: true }, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handlePost() {
    if (!canPost) return
    setPosting(true)
    setPostError('')

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, body }),
    })
    const data = await res.json()

    if (!res.ok) {
      setPostError(data.error)
      setPosting(false)
      return
    }

    setBody('')
    setPosting(false)
  }

  function scrollToCompose() {
    composeRef.current?.scrollIntoView({ behavior: 'smooth' })
    composeRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black border-b border-white/10 h-12 flex items-center justify-between px-4">
        <span className="text-[#F5C400] text-lg font-medium tracking-tight">abeille</span>
        <span className={`text-xs tabular-nums ${wc > 24 ? 'text-red-500' : wc > 20 ? 'text-[#F5C400]' : 'text-white/30'}`}>
          {wc}/24
        </span>
      </header>

      {/* Compose */}
      <div className="border-b border-[#F5C400]/20 px-4 py-3 flex flex-col gap-2">
        <textarea
          ref={composeRef}
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="say it in 24 words."
          className="bg-black text-white placeholder:text-white/20 text-sm resize-none outline-none focus:outline-none w-full"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="bg-black text-white placeholder:text-white/20 text-sm outline-none focus:outline-none w-full border-t border-white/10 pt-2"
        />
        {postError && <p className="text-red-500 text-xs">{postError}</p>}
        <button
          onClick={handlePost}
          disabled={!canPost}
          className="self-start bg-[#F5C400] text-black text-xs font-semibold px-4 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFD000] transition-colors"
        >
          {posting ? 'posting…' : 'post →'}
        </button>
      </div>

      {/* Board */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-white/20 text-sm text-center py-16">
            no signals yet. be the first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {messages.map((msg) => (
              <Card key={msg.id} msg={msg} onPostFirst={scrollToCompose} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadein { animation: fadein 200ms ease-out forwards; }
      `}</style>
    </div>
  )
}
