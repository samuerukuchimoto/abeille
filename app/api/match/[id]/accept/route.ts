import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch the request
    const { data: request, error: reqError } = await supabaseAdmin
      .from('connection_requests')
      .select('*, posts(*)')
      .eq('id', id)
      .eq('status', 'forwarded')
      .maybeSingle()

    if (reqError) throw reqError
    if (!request) {
      return NextResponse.json({ error: 'Request not found or already handled' }, { status: 404 })
    }

    const post = request.posts

    // Mark accepted
    await supabaseAdmin
      .from('connection_requests')
      .update({ status: 'accepted' })
      .eq('id', id)

    // Mark post as matched
    await supabaseAdmin
      .from('posts')
      .update({ status: 'matched' })
      .eq('id', request.post_id)

    // Insert match record
    await supabaseAdmin.from('matches').insert({
      post_id: request.post_id,
      request_id: id,
      poster_email: post.author_email,
      requester_email: request.requester_email,
      contacts_released: true,
    })

    // Send contact emails to both
    await Promise.all([
      sendEmail({
        to: post.author_email,
        subject: 'Connection accepted — contact revealed',
        text: [
          'You accepted. Here is their contact:',
          '',
          request.requester_email,
          '',
          'What they said they bring:',
          request.requester_signal,
          '',
          "That's it. The rest is yours.",
        ].join('\n'),
      }),
      sendEmail({
        to: request.requester_email,
        subject: 'Your connection was accepted',
        text: [
          'They accepted your signal. Here is their contact:',
          '',
          post.author_email,
          '',
          'Their original signal:',
          post.content,
          '',
          "That's it. The rest is yours.",
        ].join('\n'),
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[abeille] accept:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}