'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const EMOJIS = ['🐷', '🐱', '🐻', '🐼', '🐨', '🦊', '🐶', '🐰', '🦁', '🐯']
const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

interface PresenceUser {
  user_id: string
  emoji: string
  color: string
}

function getOrCreateIdentity(): PresenceUser {
  try {
    const stored = sessionStorage.getItem('map-mate-identity')
    if (stored) return JSON.parse(stored) as PresenceUser
  } catch {}
  const identity: PresenceUser = {
    user_id: Math.random().toString(36).slice(2),
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
  try { sessionStorage.setItem('map-mate-identity', JSON.stringify(identity)) } catch {}
  return identity
}

export default function PresenceAvatars() {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const me = getOrCreateIdentity()
    const channel = supabase.channel('map-mate-presence', {
      config: { presence: { key: me.user_id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        setUsers(Object.values(state).flat())
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track(me)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (users.length === 0) return null

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.map(user => (
          <div
            key={user.user_id}
            title={`在线 · ${user.emoji}`}
            style={{ backgroundColor: user.color }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-lg ring-2 ring-gray-900"
          >
            {user.emoji}
          </div>
        ))}
      </div>
      <span className="text-white/60 text-xs bg-gray-900/70 px-2 py-0.5 rounded-full">
        {users.length} 在线
      </span>
    </div>
  )
}
