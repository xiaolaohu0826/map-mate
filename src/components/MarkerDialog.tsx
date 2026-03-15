'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { MarkerStyle, MARKER_STYLE_EMOJI, MARKER_STYLES } from '@/types'

interface MarkerDialogProps {
  open: boolean
  lat: number
  lng: number
  initialNote?: string
  onSave: (style: MarkerStyle, note: string) => void
  onClose: () => void
}

export default function MarkerDialog({ open, lat, lng, initialNote, onSave, onClose }: MarkerDialogProps) {
  const [selectedStyle, setSelectedStyle] = useState<MarkerStyle>('heart')
  const [note, setNote] = useState(initialNote ?? '')

  if (!open) return null

  const handleSave = () => {
    onSave(selectedStyle, note)
    setNote('')
    setSelectedStyle('heart')
  }

  return (
    <div
      data-testid="marker-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold text-lg">添加标记</h2>
          <button
            data-testid="close-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {initialNote ? (
          <p className="text-white text-sm font-medium mb-4 truncate">{initialNote}</p>
        ) : (
          <p className="text-gray-400 text-xs mb-4">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
        )}
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">选择样式</p>
          <div className="flex gap-3 justify-center">
            {MARKER_STYLES.map(s => (
              <button
                key={s}
                data-testid={`style-btn-${s}`}
                onClick={() => setSelectedStyle(s)}
                className={`text-3xl p-2 rounded-xl transition-all ${
                  selectedStyle === s
                    ? 'bg-indigo-500/30 ring-2 ring-indigo-400 scale-110'
                    : 'hover:bg-gray-700'
                }`}
              >
                {MARKER_STYLE_EMOJI[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <p className="text-gray-300 text-sm mb-2">备注</p>
          <textarea
            data-testid="note-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="写下你们的心情或计划..."
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl p-3 text-sm outline-none border border-gray-600 focus:border-indigo-500 resize-none h-20"
          />
        </div>
        <div className="flex gap-3">
          <button
            data-testid="cancel-btn"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
          >
            取消
          </button>
          <button
            data-testid="save-btn"
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
