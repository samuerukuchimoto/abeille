import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

const TEST_MODE = process.env.TEST_MODE === 'true'

export async function POST(req: NextRequest) {
  try {
    const { response_id, approver_email } = await req.json()

    if (!response_id) {
      return NextResponse.json({ error: 'response_id required' }, { status: 400 })
    }
    if (!approver_email || !approver_email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const normalEmail = approver_email.toLowerCase().trim()

    const { data: response } = await supabaseAdmin
      .from('responses')
      .select('id, problem_id, responder_email, body, is_approved')
      .eq('id', response_id)
      .maybeSingle()

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    const { data: problem } = await supabaseAdmin
      .from('messages')
      .select('id, email, body, is_solved')
      .eq('id', response.problem_id)
      .maybeSingle()

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
    }

    if (!TEST_MODE && problem.email !== normalEmail) {
      return NextResponse.json(
        { error: 'Only the problem poster can approve.' },
        { status: 403 }
      )
    }
    if (TEST_MODE && problem.email !== normalEmail) {
      console.log('[abeille] TEST_MODE: skipping approver email match check')
    }

    if (problem.is_solved) {
      return NextResponse.json({ error: 'This problem is already solved' }, { status: 400 })
    }

    await supabaseAdmin
      .from('responses')
      .update({ is_approved: true, approved_at: new Date().toISOString() })
      .eq('id', response_id)

    await supabaseAdmin
      .from('messages')
      .update({ is_solved: true, solved_at: new Date().toISOString() })
      .eq('id', problem.id)

    await sendEmail({
      to: response.responder_email,
      subject: 'Your response was chosen on Abeille',
      text: [
        'Someone accepted your response.',
        '',
        'The problem:',
        problem.body,
        '',
        'Your response:',
        response.body,
        '',
        'Their email:',
        problem.email,
        '',
        "That's it. The rest is yours.",
      ].join('\n'),
    })

    await sendEmail({
      to: problem.email,
      subject: 'You found your answer on Abeille',
      text: [
        'You approved a response to your problem.',
        '',
        'Their response:',
        response.body,
        '',
        'Their email:',
        response.responder_email,
        '',
        "That's it. The rest is yours.",
      ].join('\n'),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const e = err as Error
    console.error('[abeille] POST /api/approve:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}