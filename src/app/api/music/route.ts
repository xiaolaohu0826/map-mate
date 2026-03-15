import { readdir } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  const musicDir = path.join(process.cwd(), 'public', 'music')
  try {
    const files = await readdir(musicDir)
    const songs = files.filter(f => /\.(mp3|wav|ogg|m4a|flac)$/i.test(f))
    return NextResponse.json(songs)
  } catch {
    return NextResponse.json([])
  }
}
