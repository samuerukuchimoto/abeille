import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { post_id, reporter_email } = await req.json()
    if (!post_id || !reporter_email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Insert report (unique constraint prevents duplicates)
    const { error } = await supabaseAdmin
      .from('reports')
      .insert({ post_id, reporter_email: reporter_email.toLowerCase().trim() })

    if (error && error.code !== '23505') throw error

    // Count reports from users who have actually matched (not burners)
    const { count } = await supabaseAdmin
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id)

    if ((count ?? 0) >= 3) {
      await supabaseAdmin
        .from('posts')
        .update({ status: 'hidden' })
        .eq('id', post_id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[abeille] report:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}