import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { error } = await supabaseAdmin
      .from('connection_requests')
      .update({ status: 'declined_by_poster' })
      .eq('id', id)
      .eq('status', 'forwarded')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[abeille] decline:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}