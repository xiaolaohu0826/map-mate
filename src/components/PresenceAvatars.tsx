'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const EMOJIS = ['🐷', '🐱', '🐻', '🐼', '🐨', '🦊', '🐶', '🐰', '🦁', '🐯']
const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

interface PresenceUser {
  user_id: string
  emoji: string
  color: string
  avatar?: string
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function getOrCreateIdentity(): Promise<PresenceUser> {
  // Fetch available avatars
  let avatarFile: string | undefined
  try {
    const res = await fetch('/api/avatar')
    const list: string[] = await res.json()
    if (list.length > 0) avatarFile = pickRandom(list)
  } catch {}

  try {
    const stored = sessionStorage.getItem('map-mate-identity')
    if (stored) {
      const identity = JSON.parse(stored) as PresenceUser
      // Refresh avatar if new ones are available but this session has none
      if (!identity.avatar && avatarFile) {
        identity.avatar = avatarFile
        sessionStorage.setItem('map-mate-identity', JSON.stringify(identity))
      }
      return identity
    }
  } catch {}

  const identity: PresenceUser = {
    user_id: Math.random().toString(36).slice(2),
    emoji: pickRandom(EMOJIS),
    color: pickRandom(COLORS),
    avatar: avatarFile,
  }
  try { sessionStorage.setItem('map-mate-identity', JSON.stringify(identity)) } catch {}
  return identity
}

export default function PresenceAvatars() {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>

    getOrCreateIdentity().then(me => {
      channel = supabase.channel('map-mate-presence', {
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
    })

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.map(user => (
          <div
            key={user.user_id}
            title={`在线 · ${user.emoji}`}
            style={{ backgroundColor: user.color }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-lg ring-2 ring-gray-900 overflow-hidden flex-shrink-0"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.emoji}
                className="w-full h-full object-cover"
              />
            ) : (
              user.emoji
            )}
          </div>
        ))}
      </div>
      <span className="text-white/60 text-xs bg-gray-900/70 px-2 py-0.5 rounded-full pointer-events-none">
        {users.length} 在线
      </span>
    </div>
  )
}
