'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MarkerData, MarkerStyle } from '@/types'
import MarkerDialog from '@/components/MarkerDialog'
import NotesSidebar from '@/components/NotesSidebar'
import MusicPlayer from '@/components/MusicPlayer'
import PresenceAvatars from '@/components/PresenceAvatars'
import BottomTabBar, { Tab } from '@/components/BottomTabBar'
import AvatarUpload from '@/components/AvatarUpload'
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
  const [topoVisible, setTopoVisible] = useState(false)
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
            topoVisible={topoVisible}
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
          <FootprintView topoVisible={topoVisible} />
        </div>

        {/* Global overlays — always visible regardless of tab */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <PresenceAvatars />
          <div className="flex gap-2">
            <AvatarUpload />
            <button
              onClick={() => setTopoVisible(v => !v)}
              title={topoVisible ? '隐藏高程图' : '显示高程图'}
              className={`p-2 backdrop-blur-sm border rounded-xl transition-colors ${
                topoVisible
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-900/95 border-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </div>
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
