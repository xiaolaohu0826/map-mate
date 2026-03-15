'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { MarkerData, MarkerStyle } from '@/types'
import MarkerDialog from '@/components/MarkerDialog'
import NotesSidebar from '@/components/NotesSidebar'
import MusicPlayer from '@/components/MusicPlayer'
import PresenceAvatars from '@/components/PresenceAvatars'
import { PlaceResult } from '@/components/SearchBar'

const MapWrapper = dynamic(() => import('@/components/MapWrapper'), { ssr: false })
const SearchBar = dynamic(() => import('@/components/SearchBar'), { ssr: false })

export default function Home() {
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingLoc, setPendingLoc] = useState<{ lat: number; lng: number; placeName?: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [focusTarget, setFocusTarget] = useState<MarkerData | null>(null)
  const [searchResult, setSearchResult] = useState<PlaceResult | null>(null)
  const panToRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null)

  // Load existing markers from Supabase
  useEffect(() => {
    supabase
      .from('markers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setMarkers(data as MarkerData[])
      })
  }, [])

  const handleMapClick = useCallback((lat: number, lng: number, placeName?: string) => {
    setPendingLoc({ lat, lng, placeName })
    setDialogOpen(true)
  }, [])

  const handleSaveMarker = useCallback(
    async (style: MarkerStyle, note: string) => {
      if (!pendingLoc) return
      const { data, error } = await supabase
        .from('markers')
        .insert({ lat: pendingLoc.lat, lng: pendingLoc.lng, style, note })
        .select()
        .single()
      if (!error && data) {
        setMarkers(prev => [data as MarkerData, ...prev])
      }
      setDialogOpen(false)
      setPendingLoc(null)
    },
    [pendingLoc]
  )

  const handlePlaceSelected = useCallback((result: PlaceResult) => {
    panToRef.current?.(result.lat, result.lng, 14)
    setSearchResult(result)
  }, [])

  const handlePanReady = useCallback((panFn: (lat: number, lng: number, zoom?: number) => void) => {
    panToRef.current = panFn
  }, [])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-950">
      <MapWrapper
        markers={markers}
        onMapClick={handleMapClick}
        focusTarget={focusTarget}
        onFocusComplete={() => setFocusTarget(null)}
        onPanReady={handlePanReady}
        searchResult={searchResult}
        onSearchResultClear={() => setSearchResult(null)}
      />
      <SearchBar onPlaceSelected={handlePlaceSelected} />
      <NotesSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        markers={markers}
        onMarkerFocus={marker => {
          setFocusTarget(marker)
          setSidebarOpen(false)
        }}
      />
      <MusicPlayer />
      <PresenceAvatars />
      {dialogOpen && pendingLoc && (
        <MarkerDialog
          open={dialogOpen}
          lat={pendingLoc.lat}
          lng={pendingLoc.lng}
          initialNote={pendingLoc.placeName}
          onSave={handleSaveMarker}
          onClose={() => {
            setDialogOpen(false)
            setPendingLoc(null)
          }}
        />
      )}
    </main>
  )
}
