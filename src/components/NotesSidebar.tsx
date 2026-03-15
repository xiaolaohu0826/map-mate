'use client'

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { MarkerData, MARKER_STYLE_EMOJI } from '@/types'

interface NotesSidebarProps {
  open: boolean
  onToggle: () => void
  markers: MarkerData[]
  onMarkerFocus: (marker: MarkerData) => void
}

export default function NotesSidebar({ open, onToggle, markers, onMarkerFocus }: NotesSidebarProps) {
  return (
    <>
      <button
        data-testid="sidebar-toggle"
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-gray-900/90 border border-l-0 border-gray-700 rounded-r-xl p-2 text-white hover:bg-gray-800 transition-colors"
      >
        {open ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      <div
        data-testid="notes-sidebar"
        className={`absolute left-0 top-0 h-full z-10 w-72 bg-gray-950/95 backdrop-blur-sm border-r border-gray-800 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-400" />
          <h2 className="text-white font-semibold text-base">已标记的地点</h2>
          <span className="ml-auto text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded-full">
            {markers.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {markers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2 p-4">
              <span className="text-4xl">🗺️</span>
              <p>还没有标记，快去地图上添加吧！</p>
            </div>
          ) : (
            <ul data-testid="marker-list" className="p-2 space-y-1">
              {markers.map(marker => (
                <li key={marker.id}>
                  <button
                    data-testid={`note-item-${marker.id}`}
                    onClick={() => onMarkerFocus(marker)}
                    className="w-full text-left p-3 rounded-xl hover:bg-gray-800/80 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{MARKER_STYLE_EMOJI[marker.style]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-indigo-300 transition-colors">
                          {marker.note || '无备注'}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
