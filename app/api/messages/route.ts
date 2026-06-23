import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { embed } from '@/lib/embed'

const TEST_MODE = process.env.TEST_MODE === 'true'

function wordCount(s: string) {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .rpc('get_board_messages', { p_limit: 50 })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

export async function POST(req: NextRequest) {
  try {
    const { email, body } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!body) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 })
    }
    if (wordCount(body) > 24) {
      return NextResponse.json({ error: 'Maximum 24 words' }, { status: 400 })
    }

    const normalEmail = email.toLowerCase().trim()

    // One active message per email
    const { data: existing } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('email', normalEmail)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active message. It expires in 24 hours.' },
        { status: 429 }
      )
    }

    // Classify + extract essence via Groq
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You classify and distill a short human message for a public exchange board. The message is at most 24 words.

Determine:
- type: is this person primarily SEEKING something they need, or OFFERING something they have? Answer 'seek' or 'offer'. If ambiguous, answer 'seek'.
- essence: rewrite the core signal in 10 words or fewer, third person, no demographics, pure need or offer.
  Example: 'Has legal expertise, needs distribution in France.'

Output valid JSON only:
{ "type": "seek" | "offer", "essence": "..." }`,
          },
          { role: 'user', content: body },
        ],
      }),
    })

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content ?? '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const { type, essence } = JSON.parse(clean)

    // Embed body + essence combined
    const embedding = await embed(body + ' ' + (essence ?? ''))

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        email: normalEmail,
        body: body.trim(),
        type: type === 'offer' ? 'offer' : 'seek',
        essence,
        embedding,
        word_count: wordCount(body),
        expires_at: expiresAt,
        is_active: true,
      })
      .select('id, type')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id, type: data.type })
  } catch (err: unknown) {
    const e = err as Error
    console.error('[abeille] POST /api/messages:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
