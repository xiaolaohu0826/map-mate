import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const avatarDir = path.join(process.cwd(), 'public', 'avatar')
  await mkdir(avatarDir, { recursive: true })

  // Sanitize filename
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  await writeFile(path.join(avatarDir, filename), buffer)

  return NextResponse.json({ filename })
}
