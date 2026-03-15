import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'avatars'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return NextResponse.json({ filename, url: data.publicUrl })
}
