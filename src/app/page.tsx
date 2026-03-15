'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { MarkerData, MarkerStyle } from '@/types'
import MarkerDialog from '@/components/MarkerDialog'
import NotesSidebar from '@/components/NotesSidebar'
import MusicPlayer from '@/components/MusicPlayer'
import PresenceAvatars from '@/components/PresenceAvatars'
import BottomTabBar, { Tab } from '@/components/BottomTabBar'
import { PlaceResult } from '@/components/SearchBar'

const MapWrapper = dynamic(() => import('@/components/MapWrapper'), { ssr: false })
const SearchBar = dynamic(() => import('@/components/SearchBar'), { ssr: false })
const FootprintView = dynamic(() => import('@/components/FootprintView'), { ssr: false })

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('map')
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingLoc, setPendingLoc] = useState<{ lat: number; lng: number; placeName?: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [focusTarget, setFocusTarget] = useState<MarkerData | null>(null)
  const [searchResult, setSearchResult] = useState<PlaceResult | null>(null)
  const panToRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null)

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
      if (!error && data) setMarkers(prev => [data as MarkerData, ...prev])
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
    <main className="flex flex-col w-screen h-screen bg-gray-950">
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Map tab */}
        <div className={activeTab === 'map' ? 'absolute inset-0' : 'hidden'}>
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
        </div>

        {/* Footprint tab */}
        <div className={activeTab === 'footprint' ? 'absolute inset-0' : 'hidden'}>
          <FootprintView />
        </div>

        {/* Global overlays — always visible regardless of tab */}
        <PresenceAvatars />
        <MusicPlayer />
      </div>

      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

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
