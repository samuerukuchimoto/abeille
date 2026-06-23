import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { embed } from '@/lib/scoring'

function wordCount(s: string) {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length
}

function generateHandle(): string {
  const word = ['signal', 'hive', 'pulse', 'node', 'relay', 'wave', 'beacon'][
    Math.floor(Math.random() * 7)
  ]
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${word}-${suffix}`
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, handle, content, status, created_at')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const { content, email } = await req.json()

    if (!content || !email) {
      return NextResponse.json({ error: 'content and email required' }, { status: 400 })
    }

    if (wordCount(content) > 24) {
      return NextResponse.json({ error: 'Maximum 24 words' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'valid email required' }, { status: 400 })
    }

    // One active post per email per 24h
    const { data: existing } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('author_email', email.toLowerCase().trim())
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active signal. It expires in 24 hours.' },
        { status: 429 }
      )
    }

    // Embed the content
    const embedding = await embed(content)

    const handle = generateHandle()

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        handle,
        content: content.trim(),
        author_email: email.toLowerCase().trim(),
        embedding,
        status: 'active',
      })
      .select('id, handle')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, handle: data.handle })
  } catch (err: any) {
    console.error('[abeille] POST /api/posts:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}