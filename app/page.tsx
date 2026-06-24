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

  // SEEK: yellow bg + black border + black text + hard black drop-shadow
  // OFFER: black bg + yellow border + yellow text + hard yellow drop-shadow
  const seek = {
    card: { background: '#F5C400', border: '3px solid #000', borderRadius: '20px', padding: '1.125rem', boxShadow: '6px 6px 0px 0px #000000', transition: 'transform 100ms ease, box-shadow 100ms ease' } as React.CSSProperties,
    badge: { display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#000', color: '#F5C400', fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '3px 10px', borderRadius: '100px' } as React.CSSProperties,
    time: { color: 'rgba(0,0,0,0.45)', fontSize: '10px', fontWeight: 700 } as React.CSSProperties,
    body: { color: '#000', fontSize: '15px', fontWeight: 700, lineHeight: 1.55 } as React.CSSProperties,
    btn: { background: '#000', color: '#F5C400', border: '2px solid #000', borderRadius: '100px', padding: '7px 18px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'background 100ms ease, color 100ms ease', fontFamily: 'inherit' } as React.CSSProperties,
    input: { background: 'rgba(0,0,0,0.12)', border: '2px solid rgba(0,0,0,0.35)', borderRadius: '100px', color: '#000', fontSize: '12px', fontWeight: 600, padding: '8px 14px', width: '100%', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
    label: { color: 'rgba(0,0,0,0.55)', fontSize: '11px', fontWeight: 700 } as React.CSSProperties,
    link: { color: '#000', fontSize: '11px', fontWeight: 900, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 } as React.CSSProperties,
    success: { color: '#000', fontSize: '12px', fontWeight: 900 } as React.CSSProperties,
  }

  const offer = {
    card: { background: '#000', border: '3px solid #F5C400', borderRadius: '20px', padding: '1.125rem', boxShadow: '6px 6px 0px 0px #F5C400', transition: 'transform 100ms ease, box-shadow 100ms ease' } as React.CSSProperties,
    badge: { display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F5C400', color: '#000', fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '3px 10px', borderRadius: '100px' } as React.CSSProperties,
    time: { color: 'rgba(245,196,0,0.45)', fontSize: '10px', fontWeight: 700 } as React.CSSProperties,
    body: { color: '#F5C400', fontSize: '15px', fontWeight: 700, lineHeight: 1.55 } as React.CSSProperties,
    btn: { background: '#F5C400', color: '#000', border: '2px solid #F5C400', borderRadius: '100px', padding: '7px 18px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'background 100ms ease, color 100ms ease', fontFamily: 'inherit' } as React.CSSProperties,
    input: { background: 'rgba(245,196,0,0.08)', border: '2px solid rgba(245,196,0,0.35)', borderRadius: '100px', color: '#F5C400', fontSize: '12px', fontWeight: 600, padding: '8px 14px', width: '100%', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
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
        e.currentTarget.style.transform = 'translate(-2px,-2px)'
        e.currentTarget.style.boxShadow = isSeek ? '8px 8px 0px 0px #000000' : '8px 8px 0px 0px #F5C400'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0,0)'
        e.currentTarget.style.boxShadow = isSeek ? '6px 6px 0px 0px #000000' : '6px 6px 0px 0px #F5C400'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={s.badge}>◆ {isSeek ? 'seeking' : 'offering'}</span>
        <span style={s.time}>{msg.time_ago}</span>
      </div>

      <p style={{ ...s.body, marginBottom: '16px' }}>{msg.body}</p>

      {connect.status === 'idle' && (
        <button style={s.btn} onClick={() => setConnect({ status: 'open' })}>connect →</button>
      )}
      {connect.status === 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input type="email" placeholder="your@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            style={s.input} />
          <button style={s.btn} onClick={handleConnect}>send request →</button>
        </div>
      )}
      {connect.status === 'loading' && <p style={s.label}>sending…</p>}
      {connect.status === 'connected' && <p style={s.success}>✓ {connect.message}</p>}
      {connect.status === 'rate_limited' && <p style={s.label}>One connection per 24h. Come back tomorrow.</p>}
      {connect.status === 'error' && <p style={{ color: '#FF4040', fontSize: '11px', fontWeight: 700 }}>{connect.message}</p>}
      {connect.status === 'waiting' && (
        <div>
          <p style={{ ...s.label, marginBottom: '6px' }}>Post your own signal first — helps us find your closest match.</p>
          <button style={s.link} onClick={onPostFirst}>post yours →</button>
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

  const cardStyle: React.CSSProperties = isSeek
    ? { background: 'rgba(245,196,0,0.85)', border: '2px solid #000', borderRadius: '14px', padding: '10px 12px' }
    : { background: 'rgba(0,0,0,0.9)', border: '2px solid #F5C400', borderRadius: '14px', padding: '10px 12px' }

  const bodyStyle: React.CSSProperties = { color: isSeek ? '#000' : '#F5C400', fontSize: '12px', fontWeight: 700, lineHeight: 1.5, marginBottom: '8px' }

  const btnStyle: React.CSSProperties = {
    background: isSeek ? '#000' : '#F5C400', color: isSeek ? '#F5C400' : '#000',
    border: 'none', borderRadius: '100px', padding: '4px 12px',
    fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
  }

  const inputStyle: React.CSSProperties = {
    background: isSeek ? 'rgba(0,0,0,0.12)' : 'rgba(245,196,0,0.1)',
    border: isSeek ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(245,196,0,0.3)',
    borderRadius: '100px', color: isSeek ? '#000' : '#F5C400',
    fontSize: '10px', fontWeight: 600, padding: '5px 10px', flex: 1, outline: 'none', fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = { color: isSeek ? 'rgba(0,0,0,0.55)' : 'rgba(245,196,0,0.55)', fontSize: '10px', fontWeight: 700 }

  return (
    <div style={cardStyle}>
      <p style={bodyStyle}>{msg.body}</p>
      {connect.status === 'idle' && <button style={btnStyle} onClick={() => setConnect({ status: 'open' })}>connect →</button>}
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
        <button style={{ ...labelStyle, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={onPostFirst}>post yours first →</button>
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message
        setMessages((prev) => [{ ...newMsg, time_ago: 'just now', fresh: true }, ...prev])
      })
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
    if (!res.ok) { setPostError(data.error); setPosting(false); return }
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

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.92)', borderBottom: '3px solid #F5C400',
        backdropFilter: 'blur(8px)', height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
      }}>
        <span style={{ color: '#F5C400', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', textShadow: '0 0 24px rgba(245,196,0,0.45)' }}>
          abeille
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F5C400', border: '1px solid rgba(245,196,0,0.3)', padding: '3px 9px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F5C400', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
            live
          </span>
          <span style={{ fontSize: '12px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: wcColor }}>{wc}/24</span>
        </div>
      </header>

      {/* ── Compose — BLACK card with yellow border ── */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 8px' }}>
        <div style={{
          background: '#000',
          border: '3px solid #F5C400',
          borderRadius: '22px',
          padding: '18px 20px',
          boxShadow: '6px 6px 0px 0px #F5C400',
        }}>
          <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,196,0,0.45)', marginBottom: '12px' }}>
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
              resize: 'none', outline: 'none', width: '100%', border: 'none', fontFamily: 'inherit',
            }}
          />

          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(245,196,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                background: 'rgba(245,196,0,0.06)', border: '2px solid rgba(245,196,0,0.25)',
                borderRadius: '100px', color: '#fff', fontSize: '13px', fontWeight: 600,
                padding: '9px 16px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 100ms ease',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#F5C400'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(245,196,0,0.25)'}
            />
            <button
              onClick={handlePost}
              disabled={!canPost}
              style={{
                alignSelf: 'flex-start',
                background: '#F5C400', color: '#000',
                border: '2px solid #F5C400', borderRadius: '100px',
                padding: '9px 24px', fontSize: '12px', fontWeight: 900,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: canPost ? 'pointer' : 'not-allowed',
                opacity: canPost ? 1 : 0.4,
                fontFamily: 'inherit', transition: 'opacity 100ms ease',
              }}
            >
              {posting ? 'posting…' : 'post →'}
            </button>
            {postError && <p style={{ color: '#FF4040', fontSize: '12px', fontWeight: 700 }}>{postError}</p>}
          </div>
        </div>
      </div>

      {/* ── Board ── */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 60px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 16px' }}>
            <p style={{ color: 'rgba(245,196,0,0.2)', fontSize: '14px', fontWeight: 800 }}>no signals yet.</p>
            <p style={{ color: 'rgba(245,196,0,0.1)', fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>be the first.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {messages.map((msg) => (
              <Card key={msg.id} msg={msg} onPostFirst={scrollToCompose} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadein { from { opacity:0; transform:translateY(-10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .card-enter { animation: fadein 280ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: rgba(255,255,255,0.2); }
        input::placeholder { color: inherit; opacity: 0.45; }
        @media (max-width:560px) { div[style*="auto-fill"] { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; } }
      `}</style>
    </div>
  )
}
