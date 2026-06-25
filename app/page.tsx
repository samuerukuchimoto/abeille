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
  type: 'seek' | 'offer' | 'problem'
  time_ago: string
  created_at: string
  fresh?: boolean
  response_count?: number
  is_solved?: boolean
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

// ── Card ────────────────────────────────────────────────────────────────────

function Card({ msg, onPostFirst }: { msg: Message; onPostFirst: () => void }) {
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
    else if (data.outcome === 'redirected') setConnect({ status: 'redirected', message: data.message, suggestions: data.suggestions })
    else if (data.outcome === 'waiting') setConnect({ status: 'waiting', message: data.message })
  }

  const seek = {
    card: {
      background: '#F5C400',
      border: '3px solid #000',
      borderRadius: '20px',
      padding: '1.125rem',
      boxShadow: '6px 6px 0px 0px #000000',
      transition: 'transform 100ms ease, box-shadow 100ms ease',
    } as React.CSSProperties,
    badge: {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: '#000', color: '#F5C400',
      fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
      padding: '3px 10px', borderRadius: '100px',
    } as React.CSSProperties,
    time: { color: 'rgba(0,0,0,0.45)', fontSize: '10px', fontWeight: 700 } as React.CSSProperties,
    body: { color: '#000', fontSize: '15px', fontWeight: 700, lineHeight: 1.55 } as React.CSSProperties,
    btn: {
      background: '#000', color: '#F5C400',
      border: '2px solid #000', borderRadius: '100px',
      padding: '7px 18px', fontSize: '11px', fontWeight: 900,
      letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      cursor: 'pointer', transition: 'background 100ms ease, color 100ms ease',
    } as React.CSSProperties,
    input: {
      background: 'rgba(0,0,0,0.12)', border: '2px solid rgba(0,0,0,0.35)',
      borderRadius: '100px', color: '#000',
      fontSize: '12px', fontWeight: 600,
      padding: '8px 14px', width: '100%', outline: 'none',
    } as React.CSSProperties,
    label: { color: 'rgba(0,0,0,0.55)', fontSize: '11px', fontWeight: 700 } as React.CSSProperties,
    link: { color: '#000', fontSize: '11px', fontWeight: 900, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 } as React.CSSProperties,
    success: { color: '#000', fontSize: '12px', fontWeight: 900 } as React.CSSProperties,
  }

  const offer = {
    card: {
      background: '#000',
      border: '3px solid #F5C400',
      borderRadius: '20px',
      padding: '1.125rem',
      boxShadow: '6px 6px 0px 0px #F5C400',
      transition: 'transform 100ms ease, box-shadow 100ms ease',
    } as React.CSSProperties,
    badge: {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: '#F5C400', color: '#000',
      fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
      padding: '3px 10px', borderRadius: '100px',
    } as React.CSSProperties,
    time: { color: 'rgba(245,196,0,0.45)', fontSize: '10px', fontWeight: 700 } as React.CSSProperties,
    body: { color: '#F5C400', fontSize: '15px', fontWeight: 700, lineHeight: 1.55 } as React.CSSProperties,
    btn: {
      background: '#F5C400', color: '#000',
      border: '2px solid #F5C400', borderRadius: '100px',
      padding: '7px 18px', fontSize: '11px', fontWeight: 900,
      letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      cursor: 'pointer', transition: 'background 100ms ease, color 100ms ease',
    } as React.CSSProperties,
    input: {
      background: 'rgba(245,196,0,0.08)', border: '2px solid rgba(245,196,0,0.35)',
      borderRadius: '100px', color: '#F5C400',
      fontSize: '12px', fontWeight: 600,
      padding: '8px 14px', width: '100%', outline: 'none',
    } as React.CSSProperties,
    label: { color: 'rgba(245,196,0,0.55)', fontSize: '11px', fontWeight: 700 } as React.CSSProperties,
    link: { color: '#F5C400', fontSize: '11px', fontWeight: 900, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 } as React.CSSProperties,
    success: { color: '#F5C400', fontSize: '12px', fontWeight: 900 } as React.CSSProperties,
  }

  const s = isSeek ? seek : offer

  return (
    <div
      style={s.card}
      className={msg.fresh ? 'card-enter' : ''}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translate(-2px, -2px)'
        el.style.boxShadow = isSeek ? '8px 8px 0px 0px #000000' : '8px 8px 0px 0px #F5C400'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translate(0, 0)'
        el.style.boxShadow = isSeek ? '6px 6px 0px 0px #000000' : '6px 6px 0px 0px #F5C400'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={s.badge}>◆ {isSeek ? 'seeking' : 'offering'}</span>
        <span style={s.time}>{msg.time_ago}</span>
      </div>

      <p style={{ ...s.body, marginBottom: '16px' }}>{msg.body}</p>

      {connect.status === 'idle' && (
        <button style={s.btn} onClick={() => setConnect({ status: 'open' })}>
          connect →
        </button>
      )}

      {connect.status === 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            style={s.input}
          />
          <button style={s.btn} onClick={handleConnect}>
            send request →
          </button>
        </div>
      )}

      {connect.status === 'loading' && (
        <p style={s.label}>sending…</p>
      )}

      {connect.status === 'connected' && (
        <p style={s.success}>✓ {connect.message}</p>
      )}

      {connect.status === 'rate_limited' && (
        <p style={s.label}>One connection per 24h. Come back tomorrow.</p>
      )}

      {connect.status === 'error' && (
        <p style={{ color: '#FF4040', fontSize: '11px', fontWeight: 700 }}>{connect.message}</p>
      )}

      {connect.status === 'waiting' && (
        <div>
          <p style={{ ...s.label, marginBottom: '6px' }}>
            Post your own signal first — helps us find your closest match.
          </p>
          <button style={s.link} onClick={onPostFirst}>
            post yours →
          </button>
        </div>
      )}

      {connect.status === 'redirected' && (
        <div>
          <p style={{ ...s.label, marginBottom: '10px' }}>{connect.message}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {connect.suggestions.map((sg) => (
              <MiniCard key={sg.id} msg={sg} onPostFirst={onPostFirst} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MiniCard ─────────────────────────────────────────────────────────────────

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

  const card: React.CSSProperties = isSeek
    ? { background: 'rgba(245,196,0,0.85)', border: '2px solid #000', borderRadius: '14px', padding: '10px 12px' }
    : { background: 'rgba(0,0,0,0.9)', border: '2px solid #F5C400', borderRadius: '14px', padding: '10px 12px' }

  const bodyStyle: React.CSSProperties = {
    color: isSeek ? '#000' : '#F5C400',
    fontSize: '12px', fontWeight: 700, lineHeight: 1.5, marginBottom: '8px',
  }

  const btnStyle: React.CSSProperties = {
    background: isSeek ? '#000' : '#F5C400',
    color: isSeek ? '#F5C400' : '#000',
    border: 'none', borderRadius: '100px',
    padding: '4px 12px', fontSize: '10px', fontWeight: 900,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    cursor: 'pointer',
  }

  const inputStyle: React.CSSProperties = {
    background: isSeek ? 'rgba(0,0,0,0.12)' : 'rgba(245,196,0,0.1)',
    border: isSeek ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(245,196,0,0.3)',
    borderRadius: '100px', color: isSeek ? '#000' : '#F5C400',
    fontSize: '10px', fontWeight: 600,
    padding: '5px 10px', flex: 1, outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    color: isSeek ? 'rgba(0,0,0,0.55)' : 'rgba(245,196,0,0.55)',
    fontSize: '10px', fontWeight: 700,
  }

  return (
    <div style={card}>
      <p style={bodyStyle}>{msg.body}</p>
      {connect.status === 'idle' && (
        <button style={btnStyle} onClick={() => setConnect({ status: 'open' })}>connect →</button>
      )}
      {connect.status === 'open' && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input type="email" placeholder="your@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            style={inputStyle} />
          <button style={btnStyle} onClick={handleConnect}>→</button>
        </div>
      )}
      {connect.status === 'loading' && <p style={labelStyle}>sending…</p>}
      {connect.status === 'connected' && <p style={{ ...labelStyle, fontWeight: 900 }}>✓ connected</p>}
      {connect.status === 'rate_limited' && <p style={labelStyle}>1 connection / 24h</p>}
      {connect.status === 'waiting' && (
        <button
          style={{ ...labelStyle, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={onPostFirst}
        >
          post yours first →
        </button>
      )}
    </div>
  )
}

// ── ProblemCard ──────────────────────────────────────────────────────────────

type ResponseItem = {
  id: string
  body: string
  time_ago: string
  is_approved: boolean
}

type RespondState =
  | { status: 'idle' }
  | { status: 'open' }
  | { status: 'loading' }
  | { status: 'posted' }
  | { status: 'error'; message: string }

type ExpandState =
  | { status: 'collapsed' }
  | { status: 'loading' }
  | { status: 'loaded'; responses: ResponseItem[] }
  | { status: 'error'; message: string }

function ProblemCard({ msg }: { msg: Message }) {
  const [expand, setExpand] = useState<ExpandState>({ status: 'collapsed' })
  const [respond, setRespond] = useState<RespondState>({ status: 'idle' })
  const [respondBody, setRespondBody] = useState('')
  const [respondEmail, setRespondEmail] = useState('')
  const [count, setCount] = useState(msg.response_count ?? 0)
  const [solved, setSolved] = useState(!!msg.is_solved)

  const [approveOpenId, setApproveOpenId] = useState<string | null>(null)
  const [approveEmail, setApproveEmail] = useState('')
  const [approveStatus, setApproveStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [approveError, setApproveError] = useState('')

  const respondWc = wordCount(respondBody)
  const respondInvalid = respondWc === 0 || respondWc > 24 || !respondEmail.includes('@')

  const styleCard: React.CSSProperties = {
    background: '#000',
    border: solved ? '2px solid rgba(245,196,0,0.4)' : '2px solid #F5C400',
    borderRadius: '20px',
    padding: '1.125rem',
  }
  const label: React.CSSProperties = {
    fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
    color: '#F5C400', border: '1px solid rgba(245,196,0,0.3)',
    padding: '3px 10px', borderRadius: '100px', display: 'inline-flex',
  }
  const time: React.CSSProperties = { color: 'rgba(245,196,0,0.45)', fontSize: '10px', fontWeight: 700 }
  const bodyStyle: React.CSSProperties = { color: '#F5C400', fontSize: '15px', fontWeight: 700, lineHeight: 1.55 }
  const link: React.CSSProperties = {
    color: '#F5C400', fontSize: '11px', fontWeight: 900, textDecoration: 'underline',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  }
  const btn: React.CSSProperties = {
    background: '#F5C400', color: '#000', border: '2px solid #F5C400', borderRadius: '100px',
    padding: '7px 18px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.12em',
    textTransform: 'uppercase', cursor: 'pointer',
  }
  const input: React.CSSProperties = {
    background: 'rgba(245,196,0,0.08)', border: '2px solid rgba(245,196,0,0.35)',
    borderRadius: '100px', color: '#F5C400', fontSize: '12px', fontWeight: 600,
    padding: '8px 14px', width: '100%', outline: 'none',
  }

  async function loadResponses() {
    if (expand.status === 'loaded') {
      setExpand({ status: 'collapsed' })
      return
    }
    setExpand({ status: 'loading' })
    const res = await fetch(`/api/responses?problem_id=${msg.id}`)
    const data = await res.json()
    if (!res.ok) setExpand({ status: 'error', message: data.error ?? 'Failed to load' })
    else setExpand({ status: 'loaded', responses: data.responses ?? [] })
  }

  async function handleRespond() {
    if (respondInvalid) return
    setRespond({ status: 'loading' })
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_id: msg.id, responder_email: respondEmail, body: respondBody }),
    })
    const data = await res.json()
    if (!res.ok) setRespond({ status: 'error', message: data.error })
    else {
      setRespond({ status: 'posted' })
      setCount((c) => c + 1)
    }
  }

  async function handleApprove(responseId: string) {
    if (!approveEmail.includes('@')) return
    setApproveStatus('loading')
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_id: responseId, approver_email: approveEmail }),
    })
    const data = await res.json()
    if (!res.ok) {
      setApproveStatus('error')
      setApproveError(data.error ?? 'Approval failed')
    } else {
      setApproveStatus('done')
      setSolved(true)
    }
  }

  return (
    <div style={styleCard} className={msg.fresh ? 'card-enter' : ''}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={label}>◆ {solved ? 'solved' : 'problem'}</span>
        <span style={time}>{msg.time_ago}</span>
      </div>

      <p style={{ ...bodyStyle, marginBottom: '12px' }}>{msg.body}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button style={link} onClick={loadResponses}>
          {count} response{count === 1 ? '' : 's'} →
        </button>
        {!solved && respond.status === 'idle' && (
          <button style={link} onClick={() => setRespond({ status: 'open' })}>respond →</button>
        )}
      </div>

      {respond.status === 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          <textarea
            rows={2}
            value={respondBody}
            onChange={(e) => setRespondBody(e.target.value)}
            placeholder="your response — 24 words max"
            style={{ ...input, borderRadius: '14px', resize: 'none', fontFamily: 'inherit', padding: '10px 14px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: respondWc > 24 ? '#FF4040' : 'rgba(245,196,0,0.4)' }}>
              {respondWc}/24
            </span>
          </div>
          <input
            type="email"
            placeholder="your@email.com"
            value={respondEmail}
            onChange={(e) => setRespondEmail(e.target.value)}
            style={input}
          />
          <button
            style={{ ...btn, opacity: respondInvalid ? 0.4 : 1, cursor: respondInvalid ? 'not-allowed' : 'pointer' }}
            onClick={handleRespond}
            disabled={respondInvalid}
          >
            post response →
          </button>
        </div>
      )}
      {respond.status === 'loading' && <p style={{ ...time, marginTop: '8px' }}>posting…</p>}
      {respond.status === 'posted' && <p style={{ color: '#F5C400', fontSize: '12px', fontWeight: 900, marginTop: '8px' }}>✓ response posted</p>}
      {respond.status === 'error' && <p style={{ color: '#FF4040', fontSize: '11px', fontWeight: 700, marginTop: '8px' }}>{respond.message}</p>}

      {expand.status === 'loading' && <p style={{ ...time, marginTop: '12px' }}>loading…</p>}
      {expand.status === 'error' && <p style={{ color: '#FF4040', fontSize: '11px', fontWeight: 700, marginTop: '12px' }}>{expand.message}</p>}
      {expand.status === 'loaded' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {expand.responses.length === 0 && <p style={time}>no responses yet.</p>}
          {expand.responses.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#1a1a00',
                border: '1px solid rgba(245,196,0,0.3)',
                borderRadius: '14px',
                padding: '10px 12px',
                marginLeft: '12px',
              }}
            >
              <p style={{ color: 'rgba(245,196,0,0.8)', fontSize: '12px', fontWeight: 700, lineHeight: 1.5, marginBottom: '6px' }}>
                {r.body}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(245,196,0,0.4)', fontSize: '10px', fontWeight: 700 }}>{r.time_ago}</span>
                {!solved && (
                  approveOpenId === r.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={approveEmail}
                        onChange={(e) => setApproveEmail(e.target.value)}
                        style={{ ...input, fontSize: '10px', padding: '5px 10px', width: '140px' }}
                      />
                      <button
                        style={{ ...btn, padding: '4px 12px', fontSize: '10px' }}
                        onClick={() => handleApprove(r.id)}
                      >
                        {approveStatus === 'loading' ? '…' : 'confirm'}
                      </button>
                    </div>
                  ) : (
                    <button style={link} onClick={() => { setApproveOpenId(r.id); setApproveStatus('idle') }}>
                      approve →
                    </button>
                  )
                )}
                {solved && r.is_approved && (
                  <span style={{ color: '#F5C400', fontSize: '10px', fontWeight: 900 }}>✓ approved</span>
                )}
              </div>
              {approveOpenId === r.id && approveStatus === 'error' && (
                <p style={{ color: '#FF4040', fontSize: '10px', fontWeight: 700, marginTop: '6px' }}>{approveError}</p>
              )}
              {approveOpenId === r.id && approveStatus === 'done' && (
                <p style={{ color: '#F5C400', fontSize: '10px', fontWeight: 900, marginTop: '6px' }}>done — check your email</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [email, setEmail] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const composeRef = useRef<HTMLTextAreaElement>(null)

  const wc = wordCount(body)
  const canPost = wc > 0 && wc <= 24 && email.includes('@') && !posting

  const wcColor = wc > 24 ? '#FF4040' : wc > 20 ? '#F5C400' : 'rgba(255,255,255,0.25)'

  useEffect(() => {
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))

    const channel = supabase
      .channel('messages-board')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const { email: _e, embedding: _emb, ...safeMsg } = payload.new as Record<string, unknown>
          const newMsg = { ...safeMsg, time_ago: 'just now', fresh: true } as Message
          setMessages((prev) => [newMsg, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    <div style={{
      minHeight: '100vh',
      background: '#000',
      backgroundImage: 'radial-gradient(circle, #1C1500 1.5px, transparent 1.5px)',
      backgroundSize: '22px 22px',
      fontFamily: "'Nunito', system-ui, sans-serif",
      color: '#fff',
    }}>

      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.92)',
        borderBottom: '3px solid #F5C400',
        backdropFilter: 'blur(8px)',
        height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <span style={{
          color: '#F5C400', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em',
          textShadow: '0 0 24px rgba(245,196,0,0.45)',
        }}>
          abeille
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#F5C400', border: '1px solid rgba(245,196,0,0.3)',
            padding: '3px 9px', borderRadius: '100px',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%', background: '#F5C400',
              animation: 'pulse 2s ease-in-out infinite',
              display: 'inline-block',
            }} />
            live
          </span>
          <span style={{ fontSize: '12px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: wcColor }}>
            {wc}/24
          </span>
        </div>
      </header>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 8px' }}>
        <div style={{
          background: '#000',
          border: '3px solid #F5C400',
          borderRadius: '22px',
          padding: '18px 20px',
          boxShadow: '6px 6px 0px 0px #F5C400',
        }}>
          <p style={{
            fontSize: '9px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(245,196,0,0.45)', marginBottom: '12px',
          }}>
            ◆ your signal — 24 words max
          </p>

          <textarea
            ref={composeRef}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="need something? offering something? say it."
            style={{
              background: 'transparent', color: '#fff',
              fontSize: '15px', fontWeight: 600, lineHeight: 1.6,
              resize: 'none', outline: 'none', width: '100%', border: 'none',
              fontFamily: 'inherit',
            }}
          />

          <div style={{
            marginTop: '14px', paddingTop: '14px',
            borderTop: '1px solid rgba(245,196,0,0.2)',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                background: 'rgba(245,196,0,0.06)',
                border: '2px solid rgba(245,196,0,0.25)',
                borderRadius: '100px', color: '#fff',
                fontSize: '13px', fontWeight: 600,
                padding: '9px 16px', outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 100ms ease',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#F5C400'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(245,196,0,0.25)'}
            />

            <button
              onClick={handlePost}
              disabled={!canPost}
              style={{
                alignSelf: 'flex-start',
                background: canPost ? '#F5C400' : 'rgba(245,196,0,0.25)',
                color: '#000',
                border: '2px solid #F5C400',
                borderRadius: '100px',
                padding: '9px 24px',
                fontSize: '12px', fontWeight: 900,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: canPost ? 'pointer' : 'not-allowed',
                transition: 'background 100ms ease, color 100ms ease',
                fontFamily: 'inherit',
                opacity: canPost ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (canPost) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#F5C400'
                }
              }}
              onMouseLeave={(e) => {
                if (canPost) {
                  e.currentTarget.style.background = '#F5C400'
                  e.currentTarget.style.color = '#000'
                }
              }}
            >
              {posting ? 'posting…' : 'post →'}
            </button>

            {postError && (
              <p style={{ color: '#FF4040', fontSize: '12px', fontWeight: 700 }}>{postError}</p>
            )}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 60px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 16px' }}>
            <p style={{ color: 'rgba(245,196,0,0.2)', fontSize: '14px', fontWeight: 800 }}>
              no signals yet.
            </p>
            <p style={{ color: 'rgba(245,196,0,0.1)', fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>
              be the first.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {messages.map((msg) =>
              msg.type === 'problem' ? (
                <ProblemCard key={msg.id} msg={msg} />
              ) : (
                <Card key={msg.id} msg={msg} onPostFirst={scrollToCompose} />
              )
            )}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        @keyframes fadein {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .card-enter {
          animation: fadein 280ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }

        * { box-sizing: border-box; }
        textarea::placeholder, input::placeholder { opacity: 1; }

        @media (max-width: 560px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}