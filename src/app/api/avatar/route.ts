import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const BUCKET = 'avatars'

export async function GET() {
  const { data, error } = await supabase.storage.from(BUCKET).list()
  if (error || !data) return NextResponse.json([])

  const urls = data
    .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name))
    .map(f => supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl)

  return NextResponse.json(urls)
}
