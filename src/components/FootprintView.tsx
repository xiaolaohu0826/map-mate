'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Trash2, MapPin, X } from 'lucide-react'
import { loadMaps, loadPlaces } from '@/lib/mapLoader'
import { darkMapStyles } from '@/lib/mapStyles'
import { supabase } from '@/lib/supabase'
import { Footprint, Waypoint } from '@/types'

const LEG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']

function createNumberedIcon(num: number, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="15" y="20" font-size="13" text-anchor="middle" fill="white" font-weight="bold" font-family="sans-serif">${num}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

// ── WaypointInput ────────────────────────────────────────────────────────────

interface WaypointInputProps {
  index: number
  color: string
  inputValue: string
  onInputChange: (v: string) => void
  onPlaceSelected: (wp: Waypoint) => void
  onRemove: () => void
}

function WaypointInput({ index, color, inputValue, onInputChange, onPlaceSelected, onRemove }: WaypointInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!inputRef.current) return
    let cancelled = false
    loadPlaces().then(lib => {
      if (cancelled || !inputRef.current) return
      const ac = new lib.Autocomplete(inputRef.current, {
        fields: ['geometry', 'name', 'formatted_address'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place.geometry?.location) {
          onPlaceSelected({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name ?? '',
            address: place.formatted_address ?? place.name ?? '',
          })
        }
      })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {index + 1}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={e => onInputChange(e.target.value)}
        placeholder={`地点 ${index + 1}`}
        className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none border border-gray-700 focus:border-indigo-500"
      />
      <button onClick={onRemove} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── FootprintView ────────────────────────────────────────────────────────────

interface DraftWaypoint {
  id: string
  place?: Waypoint
  inputValue: string
}

export default function FootprintView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const routeLayerRef = useRef<(google.maps.Polyline | google.maps.Marker)[]>([])

  const [footprints, setFootprints] = useState<Footprint[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftWaypoints, setDraftWaypoints] = useState<DraftWaypoint[]>([
    { id: 'w0', inputValue: '' },
    { id: 'w1', inputValue: '' },
  ])

  const clearRouteLayer = useCallback(() => {
    routeLayerRef.current.forEach(item => item.setMap(null))
    routeLayerRef.current = []
  }, [])

  const drawRoute = useCallback((waypoints: Waypoint[], colorOffset = 0) => {
    const map = mapRef.current
    if (!map || waypoints.length < 1) return

    const bounds = new google.maps.LatLngBounds()

    waypoints.forEach((wp, i) => {
      const color = LEG_COLORS[(i + colorOffset) % LEG_COLORS.length]
      bounds.extend({ lat: wp.lat, lng: wp.lng })

      const marker = new google.maps.Marker({
        position: { lat: wp.lat, lng: wp.lng },
        map,
        title: wp.name,
        icon: {
          url: createNumberedIcon(i + 1, color),
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15),
        },
      })
      routeLayerRef.current.push(marker)

      if (i < waypoints.length - 1) {
        const next = waypoints[i + 1]
        const polyline = new google.maps.Polyline({
          path: [{ lat: wp.lat, lng: wp.lng }, { lat: next.lat, lng: next.lng }],
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              strokeColor: color,
              fillColor: color,
              fillOpacity: 1,
              scale: 4,
            },
            offset: '100%',
          }],
          map,
        })
        routeLayerRef.current.push(polyline)
      }
    })

    if (waypoints.length > 1) map.fitBounds(bounds, 80)
    else map.panTo({ lat: waypoints[0].lat, lng: waypoints[0].lng })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    const init = async () => {
      await loadMaps()
      if (cancelled) return
      const map = new google.maps.Map(containerRef.current!, {
        center: { lat: 35.6896, lng: 139.7006 },
        zoom: 5,
        mapTypeId: 'roadmap',
        styles: darkMapStyles,
        gestureHandling: 'greedy',
        clickableIcons: false,
        renderingType: google.maps.RenderingType.RASTER,
      })
      mapRef.current = map

      const { data } = await supabase
        .from('footprints')
        .select('*')
        .order('created_at', { ascending: false })
      if (!cancelled && data) setFootprints(data as Footprint[])
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Redraw when viewing saved footprints
  useEffect(() => {
    if (!mapRef.current || isCreating) return
    clearRouteLayer()
    const list = selectedId ? footprints.filter(f => f.id === selectedId) : footprints
    list.forEach((f, i) => drawRoute(f.waypoints, i * 2))
  }, [footprints, isCreating, selectedId, clearRouteLayer, drawRoute])

  // Redraw draft while creating
  useEffect(() => {
    if (!isCreating || !mapRef.current) return
    clearRouteLayer()
    const resolved = draftWaypoints.filter(w => w.place).map(w => w.place!)
    if (resolved.length >= 1) drawRoute(resolved, 0)
  }, [draftWaypoints, isCreating, clearRouteLayer, drawRoute])

  const addWaypoint = () =>
    setDraftWaypoints(prev => [...prev, { id: `w${Date.now()}`, inputValue: '' }])

  const removeWaypoint = (id: string) =>
    setDraftWaypoints(prev => prev.filter(w => w.id !== id))

  const updateInput = (id: string, inputValue: string) =>
    setDraftWaypoints(prev => prev.map(w => w.id === id ? { ...w, inputValue } : w))

  const updatePlace = (id: string, place: Waypoint) =>
    setDraftWaypoints(prev => prev.map(w => w.id === id ? { ...w, place, inputValue: place.name } : w))

  const handleSave = async () => {
    const waypoints = draftWaypoints.filter(w => w.place).map(w => w.place!)
    if (waypoints.length < 2) return
    const title = draftTitle.trim() || `足迹 ${new Date().toLocaleDateString('zh-CN')}`
    const { data, error } = await supabase
      .from('footprints').insert({ title, waypoints }).select().single()
    if (!error && data) setFootprints(prev => [data as Footprint, ...prev])
    setIsCreating(false)
    setDraftTitle('')
    setDraftWaypoints([{ id: 'w0', inputValue: '' }, { id: 'w1', inputValue: '' }])
  }

  const handleCancel = () => {
    setIsCreating(false)
    setDraftTitle('')
    setDraftWaypoints([{ id: 'w0', inputValue: '' }, { id: 'w1', inputValue: '' }])
  }

  const handleDelete = async (id: string) => {
    await supabase.from('footprints').delete().eq('id', id)
    setFootprints(prev => prev.filter(f => f.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const resolvedCount = draftWaypoints.filter(w => w.place).length

  return (
    <div className="relative w-full h-full">
      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Side panel */}
      <div className="absolute top-0 left-0 h-full w-72 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
          <MapPin className="w-5 h-5 text-indigo-400" />
          <h2 className="text-white font-semibold">足迹记录</h2>
        </div>

        {!isCreating ? (
          <>
            <button
              onClick={() => setIsCreating(true)}
              className="mx-3 mt-3 flex items-center gap-2 justify-center py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              新建足迹
            </button>

            <div className="flex-1 overflow-y-auto py-2">
              {footprints.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-8 px-4">
                  还没有足迹，记录你们去过的地方吧
                </p>
              ) : (
                footprints.map((fp, fi) => (
                  <div
                    key={fp.id}
                    onClick={() => setSelectedId(fp.id === selectedId ? null : fp.id)}
                    className={`mx-3 mb-2 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedId === fp.id
                        ? 'bg-indigo-500/20 border border-indigo-500/40'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{fp.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{fp.waypoints.length} 个地点</p>
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          {fp.waypoints.map((wp, i) => (
                            <span key={i} className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: LEG_COLORS[(i + fi * 2) % LEG_COLORS.length] }}
                              />
                              {wp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(fp.id) }}
                        className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            <input
              type="text"
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              placeholder="路线名称（如：京都之旅）"
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm outline-none border border-gray-700 focus:border-indigo-500"
            />

            <div className="flex flex-col gap-2">
              {draftWaypoints.map((w, i) => (
                <WaypointInput
                  key={w.id}
                  index={i}
                  color={LEG_COLORS[i % LEG_COLORS.length]}
                  inputValue={w.inputValue}
                  onInputChange={val => updateInput(w.id, val)}
                  onPlaceSelected={place => updatePlace(w.id, place)}
                  onRemove={() => removeWaypoint(w.id)}
                />
              ))}
            </div>

            <button
              onClick={addWaypoint}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors w-fit"
            >
              <Plus className="w-4 h-4" />
              添加地点
            </button>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={resolvedCount < 2}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                保存{resolvedCount >= 2 ? `（${resolvedCount}个地点）` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
