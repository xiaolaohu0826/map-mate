'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react'

export default function MusicPlayer() {
  const [songs, setSongs] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch song list once on mount
  useEffect(() => {
    fetch('/api/music')
      .then(r => r.json())
      .then((list: string[]) => {
        const shuffled = [...list].sort(() => Math.random() - 0.5)
        setSongs(shuffled)
      })
      .catch(() => {})
  }, [])

  // Create Audio instance once
  useEffect(() => {
    const audio = new Audio()
    audio.volume = volume
    audioRef.current = audio

    audio.addEventListener('ended', () => {
      setCurrentIndex(i => i + 1)
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update src when song changes
  useEffect(() => {
    if (songs.length === 0) return
    const idx = currentIndex % songs.length
    const audio = audioRef.current
    if (!audio) return
    audio.src = `/music/${songs[idx]}`
    if (playing) audio.play().catch(() => setPlaying(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, songs])

  // Handle play / pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing && songs.length > 0) {
      if (!audio.src) {
        const idx = currentIndex % songs.length
        audio.src = `/music/${songs[idx]}`
      }
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  // Sync volume / mute
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  const togglePlay = useCallback(() => setPlaying(p => !p), [])
  const toggleMute = useCallback(() => setMuted(m => !m), [])

  const displayName =
    songs.length > 0
      ? songs[currentIndex % songs.length].replace(/\.[^.]+$/, '')
      : '暂无音乐'

  return (
    <div className="absolute bottom-6 right-6 z-20">
      <div
        className={`bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          expanded ? 'w-64' : 'w-auto'
        }`}
      >
        {expanded && (
          <div className="px-4 pt-3 pb-2">
            <p className="text-gray-300 text-xs font-medium truncate" data-testid="song-name">
              {displayName}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <VolumeX className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                data-testid="volume-slider"
                className="flex-1 h-1 accent-indigo-500"
              />
              <Volume2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 p-2">
          <button
            data-testid="expand-btn"
            onClick={() => setExpanded(e => !e)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            data-testid="mute-btn"
            onClick={toggleMute}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            data-testid="play-pause-btn"
            onClick={togglePlay}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
