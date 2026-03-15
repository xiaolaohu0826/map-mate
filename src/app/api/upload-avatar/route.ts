import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'avatars'

// Service role client — bypasses RLS, server-side only
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const bytes = await file.arrayBuffer()

  const { error } = await adminSupabase.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = adminSupabase.storage.from(BUCKET).getPublicUrl(filename)
  return NextResponse.json({ filename, url: data.publicUrl })
}
