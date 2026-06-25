import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

const TEST_MODE = process.env.TEST_MODE === 'true'

function wordCount(s: string) {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length
}

export async function GET(req: NextRequest) {
  const problemId = req.nextUrl.searchParams.get('problem_id')
  if (!problemId) {
    return NextResponse.json({ error: 'problem_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc('get_responses', { p_problem_id: problemId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ responses: data })
}

export async function POST(req: NextRequest) {
  try {
    const { problem_id, responder_email, body } = await req.json()

    if (!responder_email || !responder_email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!problem_id) {
      return NextResponse.json({ error: 'problem_id required' }, { status: 400 })
    }
    if (!body || wordCount(body) === 0) {
      return NextResponse.json({ error: 'Response body required' }, { status: 400 })
    }
    if (wordCount(body) > 24) {
      return NextResponse.json({ error: 'Maximum 24 words' }, { status: 400 })
    }

    const normalEmail = responder_email.toLowerCase().trim()

    const { data: problem } = await supabaseAdmin
      .from('messages')
      .select('id, email, body, type, is_active, expires_at, is_solved')
      .eq('id', problem_id)
      .maybeSingle()

    if (!problem || !problem.is_active || problem.expires_at < new Date().toISOString()) {
      return NextResponse.json({ error: 'Problem not found or expired' }, { status: 404 })
    }
    if (problem.type !== 'problem') {
      return NextResponse.json({ error: 'This message is not a problem' }, { status: 400 })
    }
    if (problem.is_solved) {
      return NextResponse.json({ error: 'This problem is already solved' }, { status: 400 })
    }
    if (problem.email === normalEmail) {
      return NextResponse.json({ error: 'Cannot respond to your own problem' }, { status: 400 })
    }

    if (!TEST_MODE) {
      const { data: existing } = await supabaseAdmin
        .from('responses')
        .select('id')
        .eq('problem_id', problem_id)
        .eq('responder_email', normalEmail)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'You already responded to this problem' },
          { status: 429 }
        )
      }
    } else {
      console.log('[abeille] TEST_MODE: skipping one-response-per-problem limit for', normalEmail)
    }

    const { data, error } = await supabaseAdmin
      .from('responses')
      .insert({
        problem_id,
        responder_email: normalEmail,
        body: body.trim(),
        word_count: wordCount(body),
      })
      .select('id')
      .single()

    if (error) throw error

    const { error: rpcError } = await supabaseAdmin.rpc('increment_response_count', {
      p_problem_id: problem_id,
    })
    if (rpcError) {
      console.error('[abeille] increment_response_count failed:', rpcError.message)
    }

    await sendEmail({
      to: problem.email,
      subject: 'Someone responded to your problem on Abeille',
      text: [
        'Someone responded to your problem.',
        '',
        'Your problem:',
        problem.body,
        '',
        'Their response:',
        body.trim(),
        '',
        'Go to abeille.vercel.app to approve it and get their email.',
      ].join('\n'),
    })

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: unknown) {
    const e = err as Error
    console.error('[abeille] POST /api/responses:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
