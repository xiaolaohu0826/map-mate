'use client'

import { useRef, useState } from 'react'
import { Upload, Check, X } from 'lucide-react'

type Status = 'idle' | 'uploading' | 'done' | 'error'

export default function AvatarUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [uploaded, setUploaded] = useState<string[]>([])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setStatus('uploading')
    const names: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      if (res.ok) {
        const { filename } = await res.json()
        names.push(filename)
      }
    }
    if (names.length > 0) {
      setUploaded(names)
      setStatus('done')
    } else {
      setStatus('error')
    }
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        title="上传头像图片"
        className={`p-2 backdrop-blur-sm border rounded-xl transition-colors ${
          status === 'done'
            ? 'bg-green-600 border-green-500 text-white'
            : status === 'error'
            ? 'bg-red-600 border-red-500 text-white'
            : 'bg-gray-900/95 border-gray-700 text-gray-300 hover:text-white'
        }`}
      >
        {status === 'done' ? (
          <Check className="w-4 h-4" />
        ) : status === 'error' ? (
          <X className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
      </button>
      {status === 'done' && uploaded.length > 0 && (
        <div className="absolute right-0 top-10 bg-gray-900 border border-gray-700 rounded-xl p-2 text-xs text-gray-300 whitespace-nowrap z-30">
          已上传：{uploaded.join('、')}
        </div>
      )}
    </div>
  )
}
