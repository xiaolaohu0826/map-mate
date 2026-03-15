import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'avatars'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export async function GET() {
  const { data, error } = await adminSupabase.storage.from(BUCKET).list()
  if (error || !data) return NextResponse.json([])

  const urls = data
    .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name))
    .map(f => adminSupabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl)

  return NextResponse.json(urls)
}
