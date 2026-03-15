'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Trash2, MapPin, X, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { loadMaps, loadPlaces } from '@/lib/mapLoader'
import { darkMapStyles } from '@/lib/mapStyles'
import { supabase } from '@/lib/supabase'
import { Footprint, Waypoint } from '@/types'

const LEG_COLORS = ['#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#facc15']

function createGlowMarker(num: number, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="19" fill="${color}" fill-opacity="0.15"/>
    <circle cx="20" cy="20" r="12" fill="${color}" fill-opacity="0.25"/>
    <circle cx="20" cy="20" r="8" fill="${color}" fill-opacity="0.9"/>
    <circle cx="20" cy="20" r="7" fill="none" stroke="white" stroke-width="1.2" stroke-opacity="0.7"/>
    <text x="20" y="24" font-size="9" text-anchor="middle" fill="white" font-weight="bold" font-family="sans-serif" letter-spacing="0">${num}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

// Quadratic Bezier arc between two lat/lng points
function generateArcPath(
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
  curvature: number,
  numPoints = 80
): google.maps.LatLngLiteral[] {
  const dlat = to.lat - from.lat
  const dlng = to.lng - from.lng
  const cpLat = (from.lat + to.lat) / 2 + (-dlng * curvature)
  const cpLng = (from.lng + to.lng) / 2 + (dlat * curvature)
  return Array.from({ length: numPoints + 1 }, (_, i) => {
    const t = i / numPoints
    const u = 1 - t
    return {
      lat: u * u * from.lat + 2 * u * t * cpLat + t * t * to.lat,
      lng: u * u * from.lng + 2 * u * t * cpLng + t * t * to.lng,
    }
  })
}

function samePoint(a: Waypoint, b: Waypoint): boolean {
  return Math.abs(a.lat - b.lat) < 0.001 && Math.abs(a.lng - b.lng) < 0.001
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
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const routeLayerRef = useRef<(google.maps.Polyline | google.maps.Marker)[]>([])

  const [footprints, setFootprints] = useState<Footprint[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftWaypoints, setDraftWaypoints] = useState<DraftWaypoint[]>([
    { id: 'w0', inputValue: '' },
    { id: 'w1', inputValue: '' },
  ])

  const clearRouteLayer = useCallback(() => {
    routeLayerRef.current.forEach(item => item.setMap(null))
    routeLayerRef.current = []
  }, [])

  const drawRoute = useCallback((waypoints: Waypoint[], color: string) => {
    const map = mapRef.current
    if (!map || waypoints.length < 1) return

    const bounds = new google.maps.LatLngBounds()

    waypoints.forEach((wp, i) => {
      bounds.extend({ lat: wp.lat, lng: wp.lng })

      const marker = new google.maps.Marker({
        position: { lat: wp.lat, lng: wp.lng },
        map,
        title: wp.name,
        icon: {
          url: createGlowMarker(i + 1, color),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        zIndex: 10,
      })
      marker.addListener('click', () => {
        const iw = infoWindowRef.current
        if (!iw) return
        iw.setContent(
          `<div style="color:#000;padding:8px;min-width:190px;font-family:sans-serif">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="background:${color};color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0">${i + 1}</span>
              <p style="margin:0;font-size:14px;font-weight:bold">${wp.name}</p>
            </div>
            ${wp.address ? `<p style="margin:0 0 6px 30px;font-size:12px;color:#555">${wp.address}</p>` : ''}
            <a href="https://maps.google.com/?q=${wp.lat},${wp.lng}" target="_blank" style="display:block;margin-left:30px;font-size:12px;color:#1a73e8">在 Google Maps 查看 →</a>
          </div>`
        )
        iw.open(map, marker)
      })
      routeLayerRef.current.push(marker)

      if (i < waypoints.length - 1) {
        const next = waypoints[i + 1]
        // Detect if the reverse of this segment was already drawn → flip curvature
        const hasReverse = waypoints
          .slice(0, i)
          .some((_, j) => samePoint(waypoints[j], next) && samePoint(waypoints[j + 1], wp))
        const curvature = hasReverse ? -0.22 : 0.22
        const arcPath = generateArcPath(
          { lat: wp.lat, lng: wp.lng },
          { lat: next.lat, lng: next.lng },
          curvature
        )
        const polyline = new google.maps.Polyline({
          path: arcPath,
          strokeColor: color,
          strokeWeight: 1.5,
          strokeOpacity: 0.75,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 1.8,
                fillColor: color,
                fillOpacity: 0.85,
                strokeWeight: 0,
              },
              offset: '0%',
              repeat: '8%',
            },
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                strokeColor: color,
                fillColor: color,
                fillOpacity: 1,
                scale: 2.8,
              },
              offset: '100%',
            },
          ],
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
        center: { lat: 23.1291, lng: 113.2644 },
        zoom: 1,
        mapTypeId: 'roadmap',
        styles: darkMapStyles,
        gestureHandling: 'greedy',
        clickableIcons: false,
        renderingType: google.maps.RenderingType.RASTER,
      })
      mapRef.current = map
      infoWindowRef.current = new google.maps.InfoWindow()
      map.addListener('click', () => infoWindowRef.current?.close())

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
    footprints.forEach((f, i) => {
      if (selectedId && f.id !== selectedId) return
      drawRoute(f.waypoints, LEG_COLORS[i % LEG_COLORS.length])
    })
  }, [footprints, isCreating, selectedId, clearRouteLayer, drawRoute])

  // Redraw draft while creating
  useEffect(() => {
    if (!isCreating || !mapRef.current) return
    clearRouteLayer()
    const resolved = draftWaypoints.filter(w => w.place).map(w => w.place!)
    if (resolved.length >= 1) drawRoute(resolved, LEG_COLORS[0])
  }, [draftWaypoints, isCreating, clearRouteLayer, drawRoute])

  const addWaypoint = () =>
    setDraftWaypoints(prev => [...prev, { id: `w${Date.now()}`, inputValue: '' }])

  const insertWaypoint = (afterIndex: number) =>
    setDraftWaypoints(prev => {
      const next = [...prev]
      next.splice(afterIndex + 1, 0, { id: `w${Date.now()}`, inputValue: '' })
      return next
    })

  const removeWaypoint = (id: string) =>
    setDraftWaypoints(prev => prev.filter(w => w.id !== id))

  const updateInput = (id: string, inputValue: string) =>
    setDraftWaypoints(prev => prev.map(w => w.id === id ? { ...w, inputValue } : w))

  const updatePlace = (id: string, place: Waypoint) =>
    setDraftWaypoints(prev => prev.map(w => w.id === id ? { ...w, place, inputValue: place.name } : w))

  const resetDraft = () => {
    setIsCreating(false)
    setEditingId(null)
    setDraftTitle('')
    setDraftWaypoints([{ id: 'w0', inputValue: '' }, { id: 'w1', inputValue: '' }])
  }

  const handleEdit = (fp: Footprint) => {
    setEditingId(fp.id)
    setDraftTitle(fp.title)
    setDraftWaypoints(
      fp.waypoints.map((wp, i) => ({ id: `w${i}`, place: wp, inputValue: wp.name }))
    )
    setIsCreating(true)
  }

  const handleSave = async () => {
    const waypoints = draftWaypoints.filter(w => w.place).map(w => w.place!)
    if (waypoints.length < 2) return
    const title = draftTitle.trim() || `足迹 ${new Date().toLocaleDateString('zh-CN')}`
    if (editingId) {
      const { data, error } = await supabase
        .from('footprints').update({ title, waypoints }).eq('id', editingId).select().single()
      if (!error && data) setFootprints(prev => prev.map(f => f.id === editingId ? data as Footprint : f))
    } else {
      const { data, error } = await supabase
        .from('footprints').insert({ title, waypoints }).select().single()
      if (!error && data) setFootprints(prev => [data as Footprint, ...prev])
    }
    resetDraft()
  }

  const handleCancel = () => resetDraft()

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

      {/* Toggle button when panel is closed */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute top-4 left-4 z-10 p-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Side panel */}
      <div className={`absolute top-0 left-0 h-full w-48 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex flex-col transition-transform duration-300 ${panelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <h2 className="text-white font-semibold text-sm">足迹记录</h2>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {!isCreating ? (
          <>
            <div className="mx-2 mt-2 flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => setIsCreating(true)}
                className="flex-1 flex items-center gap-2 justify-center py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建足迹
              </button>
              {selectedId && (
                <button
                  onClick={() => setSelectedId(null)}
                  className="px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
                  title="显示所有足迹"
                >
                  全部
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {footprints.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-8 px-4">
                  还没有足迹，记录你们去过的地方吧
                </p>
              ) : (
                footprints.map((fp, i) => (
                  <div
                    key={fp.id}
                    onClick={() => setSelectedId(fp.id === selectedId ? null : fp.id)}
                    className={`mx-2 mb-2 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedId === fp.id
                        ? 'border bg-gray-800 hover:bg-gray-700'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                    style={selectedId === fp.id ? { borderColor: LEG_COLORS[i % LEG_COLORS.length] + '66' } : {}}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{fp.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{fp.waypoints.length} 个地点</p>
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          {fp.waypoints.map((wp, wi) => (
                            <span key={wi} className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: LEG_COLORS[i % LEG_COLORS.length] }}
                              />
                              {wp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 mt-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); handleEdit(fp) }}
                          className="text-gray-500 hover:text-indigo-400 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(fp.id) }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            <p className="text-gray-400 text-xs font-medium">{editingId ? '编辑足迹' : '新建足迹'}</p>
            <input
              type="text"
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              placeholder="路线名称（如：京都之旅）"
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm outline-none border border-gray-700 focus:border-indigo-500"
            />

            <div className="flex flex-col gap-1">
              {draftWaypoints.map((w, i) => (
                <div key={w.id} className="flex flex-col gap-1">
                  <WaypointInput
                    index={i}
                    color={LEG_COLORS[i % LEG_COLORS.length]}
                    inputValue={w.inputValue}
                    onInputChange={val => updateInput(w.id, val)}
                    onPlaceSelected={place => updatePlace(w.id, place)}
                    onRemove={() => removeWaypoint(w.id)}
                  />
                  {i < draftWaypoints.length - 1 && (
                    <button
                      onClick={() => insertWaypoint(i)}
                      className="flex items-center gap-1 text-gray-600 hover:text-indigo-400 text-xs transition-colors w-fit ml-8"
                    >
                      <Plus className="w-3 h-3" />
                      在此插入地点
                    </button>
                  )}
                </div>
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
