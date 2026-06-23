import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cosineSim } from '@/lib/embed'
import { sendEmail } from '@/lib/email'

const TEST_MODE = process.env.TEST_MODE === 'true'

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

    // Rate limit: one connection per 24h per email
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabaseAdmin
      .from('connections')
      .select('created_at')
      .eq('requester_email', normalEmail)
      .gt('created_at', since)
      .maybeSingle()

    if (recent) {
      return NextResponse.json(
        { error: 'One connection per 24 hours. Come back tomorrow.' },
        { status: 429 }
      )
    }

    // Fetch target message
    const { data: target } = await supabaseAdmin
      .from('messages')
      .select('id, email, body, type, embedding, is_active, expires_at')
      .eq('id', target_message_id)
      .maybeSingle()

    if (!target || !target.is_active || target.expires_at < new Date().toISOString()) {
      return NextResponse.json({ error: 'Message not found or expired' }, { status: 404 })
    }

    // Fetch requester's active message
    const { data: requesterMsg } = await supabaseAdmin
      .from('messages')
      .select('id, body, type, embedding')
      .eq('email', normalEmail)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    // Compute match score
    let finalScore: number

    if (requesterMsg && requesterMsg.embedding && target.embedding) {
      const score = cosineSim(requesterMsg.embedding, target.embedding)
      const bonus = requesterMsg.type !== target.type ? 0.08 : -0.05
      finalScore = score + bonus
    } else {
      finalScore = 0.40
    }

    // Store connection attempt
    await supabaseAdmin.from('connections').insert({
      requester_email: normalEmail,
      requester_message_id: requesterMsg?.id ?? null,
      target_message_id,
      match_score: finalScore,
      status: 'pending',
    })

    // Branch on score
    if (finalScore >= 0.52) {
      // CONNECTED
      await supabaseAdmin
        .from('connections')
        .update({ status: 'accepted' })
        .eq('requester_email', normalEmail)
        .eq('target_message_id', target_message_id)

      await sendEmail({
        to: TEST_MODE ? process.env.GMAIL_USER! : target.email,
        subject: 'Someone wants to connect on Abeille',
        text: [
          'Someone saw your message and wants to connect.',
          '',
          'Their message:',
          requesterMsg?.body ?? "They haven't posted a message yet.",
          '',
          'Their email:',
          normalEmail,
          '',
          "That's it. The rest is yours.",
        ].join('\n'),
      })

      return NextResponse.json({
        outcome: 'connected',
        message: "Connection request sent. They'll receive an email.",
      })
    } else {
      // REDIRECTED — find 3 better matches
      const { data: suggestions } = await supabaseAdmin.rpc('find_similar_messages', {
        p_embedding: target.embedding,
        p_type: requesterMsg?.type ?? 'offer',
        p_exclude_id: target_message_id,
        p_limit: 3,
      })

      return NextResponse.json({
        outcome: requesterMsg ? 'redirected' : 'waiting',
        message: requesterMsg
          ? "This isn't your closest signal. These might be:"
          : 'Post your own message first — it helps us find your closest match.',
        suggestions: suggestions ?? [],
      })
    }
  } catch (err: unknown) {
    const e = err as Error
    console.error('[abeille] POST /api/connect:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
