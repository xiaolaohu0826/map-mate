import { readdir } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  const avatarDir = path.join(process.cwd(), 'public', 'avatar')
  try {
    const files = await readdir(avatarDir)
    const images = files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
    return NextResponse.json(images)
  } catch {
    return NextResponse.json([])
  }
}
