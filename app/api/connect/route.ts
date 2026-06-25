import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cosineSim } from '@/lib/embed'
import { sendEmail } from '@/lib/email'

const TEST_MODE = process.env.TEST_MODE === 'true'

function toVectorString(arr: number[]): string {
  return '[' + arr.join(',') + ']'
}

export async function POST(req: NextRequest) {
  try {
    const { requester_email, target_message_id } = await req.json()

    if (!requester_email || !requester_email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!target_message_id) {
      return NextResponse.json({ error: 'target_message_id required' }, { status: 400 })
    }

    const normalEmail = requester_email.toLowerCase().trim()

    if (!TEST_MODE) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabaseAdmin
        .from('connections')
        .select('created_at')
        .eq('requester_email', normalEmail)
        .gt('created_at', since)
        .limit(1)
        .maybeSingle()

      if (recent) {
        return NextResponse.json(
          { error: 'One connection per 24 hours. Come back tomorrow.' },
          { status: 429 }
        )
      }
    } else {
      console.log('[abeille] TEST_MODE: skipping 24h rate limit for', normalEmail)
    }

    const { data: target } = await supabaseAdmin
      .from('messages')
      .select('id, email, body, type, embedding, is_active, expires_at')
      .eq('id', target_message_id)
      .maybeSingle()

    if (!target || !target.is_active || target.expires_at < new Date().toISOString()) {
      return NextResponse.json({ error: 'Message not found or expired' }, { status: 404 })
    }

    if (target.email === normalEmail) {
      return NextResponse.json({ error: 'Cannot connect to your own message' }, { status: 400 })
    }

    const { data: requesterMsg } = await supabaseAdmin
      .from('messages')
      .select('id, body, type, embedding')
      .eq('email', normalEmail)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!requesterMsg && !TEST_MODE) {
      await supabaseAdmin.from('connections').insert({
        requester_email: normalEmail,
        requester_message_id: null,
        target_message_id,
        match_score: 0,
        status: 'pending',
      })

      return NextResponse.json({
        outcome: 'waiting',
        message: 'Post your own message first — it helps us find your closest match.',
        suggestions: [],
      })
    }

    if (!requesterMsg && TEST_MODE) {
      console.log('[abeille] TEST_MODE: requester has no active message, proceeding anyway')
    }

    function parseEmbedding(e: unknown): number[] | null {
      if (!e) return null
      if (Array.isArray(e)) return e as number[]
      if (typeof e === 'string') {
        try { return JSON.parse(e) } catch { return null }
      }
      return null
    }

    const aEmb = parseEmbedding(requesterMsg?.embedding)
    const bEmb = parseEmbedding(target.embedding)

    let finalScore: number

    if (aEmb && bEmb) {
      const score = cosineSim(aEmb, bEmb)
      const bonus = requesterMsg!.type !== target.type ? 0.08 : -0.05
      finalScore = score + bonus
    } else {
    finalScore = 0.40
    }

    console.log('[abeille] match score:', finalScore, '| TEST_MODE:', TEST_MODE)

    await supabaseAdmin.from('connections').insert({
      requester_email: normalEmail,
      requester_message_id: requesterMsg?.id ?? null,
      target_message_id,
      match_score: finalScore,
      status: TEST_MODE || finalScore >= 0.52 ? 'accepted' : 'pending',
    })

    if (TEST_MODE || finalScore >= 0.52) {
      await sendEmail({
        to: target.email,
        subject: 'Someone wants to connect on Abeille',
        text: [
          'Someone saw your message and wants to connect.',
          '',
          'Your message:',
          target.body,
          '',
          'Their message:',
          requesterMsg?.body ?? '(no message posted)',
          '',
          'Their email:',
          normalEmail,
          '',
          "That's it. The rest is yours.",
        ].join('\n'),
      })
      console.log('[abeille] connection email sent to:', target.email)

      return NextResponse.json({
        outcome: 'connected',
        message: "Connection request sent. They'll receive an email.",
      })
    }

    // REDIRECTED — cast embedding to PG vector string for RPC
    const { data: suggestions } = await supabaseAdmin.rpc('find_similar_messages', {
      p_embedding: toVectorString(requesterMsg!.embedding),
      p_type: requesterMsg!.type,
      p_exclude_id: target_message_id,
      p_limit: 3,
    })

    return NextResponse.json({
      outcome: 'redirected',
      message: "This isn't your closest signal. These might be:",
      suggestions: suggestions ?? [],
    })
  } catch (err: unknown) {
    const e = err as Error
    console.error('[abeille] POST /api/connect:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}