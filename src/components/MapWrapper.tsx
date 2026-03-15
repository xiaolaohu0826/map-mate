'use client'

import { useEffect, useRef, useCallback } from 'react'
import { loadMaps, loadPlaces } from '@/lib/mapLoader'
import { darkMapStyles } from '@/lib/mapStyles'
import { MarkerData, MARKER_STYLE_EMOJI } from '@/types'
import { PlaceResult } from '@/components/SearchBar'

interface MapWrapperProps {
  markers: MarkerData[]
  onMapClick: (lat: number, lng: number, placeName?: string) => void
  focusTarget: MarkerData | null
  onFocusComplete: () => void
  onPanReady: (panFn: (lat: number, lng: number, zoom?: number) => void) => void
  searchResult: PlaceResult | null
  onSearchResultClear: () => void
}

function createSearchPinIcon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 28 16 28S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#4f46e5"/>
    <circle cx="16" cy="16" r="7" fill="white"/>
    <circle cx="16" cy="16" r="4" fill="#4f46e5"/>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function createEmojiIcon(emoji: string): string {
  const encoded = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><text y="30" font-size="28" text-anchor="middle" x="18">${emoji}</text></svg>`
  )
  return `data:image/svg+xml;charset=UTF-8,${encoded}`
}

export default function MapWrapper({
  markers,
  onMapClick,
  focusTarget,
  onFocusComplete,
  onPanReady,
  searchResult,
  onSearchResultClear,
}: MapWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomLabelRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  // Only places namespace is unreliable as a global — store it explicitly
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null)
  const markerMapRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const poiMarkersRef = useRef<google.maps.Marker[]>([])
  const searchMarkerRef = useRef<google.maps.Marker | null>(null)

  const clearPoiMarkers = useCallback(() => {
    poiMarkersRef.current.forEach(m => m.setMap(null))
    poiMarkersRef.current = []
  }, [])

  const loadNearbyPOI = useCallback((map: google.maps.Map) => {
    const lib = placesLibRef.current
    if (!lib) {
      console.error('[MapMate] PlacesLibrary not ready')
      return
    }
    const center = map.getCenter()
    if (!center) return
    clearPoiMarkers()

    const { PlacesService, PlacesServiceStatus } = lib
    const service = new PlacesService(map)
    const types = ['restaurant', 'park', 'parking']
    console.log(`[MapMate] loadNearbyPOI at ${center.lat().toFixed(4)}, ${center.lng().toFixed(4)}`)

    try {
      const service = new PlacesService(map)
      console.log('[MapMate] nearbySearch type:', typeof service.nearbySearch)
      types.forEach(type => {
        console.log(`[MapMate] calling nearbySearch for ${type}`)
        service.nearbySearch(
          { location: center, radius: 1500, type },
          (results, status) => {
            console.log(`[MapMate] nearbySearch (${type}): ${status}, results: ${results?.length ?? 0}`)
            if (status !== PlacesServiceStatus.OK || !results) return
            const poiEmoji: Record<string, string> = { restaurant: '🍽', park: '🌳', parking: '🅿' }
            results.slice(0, 5).forEach(place => {
              if (!place.geometry?.location) return
              const m = new google.maps.Marker({
                position: place.geometry.location,
                map,
                title: place.name ?? '',
                icon: {
                  url: createEmojiIcon(poiEmoji[type] ?? '📍'),
                  scaledSize: new google.maps.Size(30, 30),
                  anchor: new google.maps.Point(15, 15),
                },
              })
              m.addListener('rightclick', () => {
                const loc = place.geometry!.location!
                onMapClick(loc.lat(), loc.lng(), place.name ?? undefined)
              })
              m.addListener('click', () => {
                if (searchMarkerRef.current) {
                  searchMarkerRef.current.setMap(null)
                  searchMarkerRef.current = null
                  onSearchResultClear()
                }
                if (!infoWindowRef.current) return
                const stars = place.rating
                  ? '⭐'.repeat(Math.round(place.rating)) + ` ${place.rating.toFixed(1)}`
                  : '暂无评分'
                const reviews = place.user_ratings_total ? `（${place.user_ratings_total} 条评价）` : ''
                infoWindowRef.current.setContent(
                  `<div style="color:#000;padding:8px;min-width:180px;font-family:sans-serif">
                    <div style="font-size:22px;text-align:center">${poiEmoji[type] ?? '📍'}</div>
                    <p style="margin:6px 0 2px;font-size:14px;font-weight:bold">${place.name ?? ''}</p>
                    ${place.vicinity ? `<p style="margin:2px 0;font-size:12px;color:#555">${place.vicinity}</p>` : ''}
                    <p style="margin:4px 0 0;font-size:12px">${stars}${reviews}</p>
                    ${place.place_id ? `<a href="https://www.google.com/maps/place/?q=place_id:${place.place_id}" target="_blank" style="display:block;margin-top:6px;font-size:12px;color:#1a73e8">在 Google Maps 查看 →</a>` : ''}
                  </div>`
                )
                infoWindowRef.current.open(map, m)
              })
              poiMarkersRef.current.push(m)
            })
          }
        )
      })
    } catch (e) {
      console.error('[MapMate] PlacesService error:', e)
    }
  }, [clearPoiMarkers])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    const init = async () => {
      // loadMaps populates google.maps.* globals; loadPlaces returns the lib object
      const [, placesLib] = await Promise.all([loadMaps(), loadPlaces()])
      if (cancelled) return

      placesLibRef.current = placesLib

      const getInitialCenter = (): Promise<{ lat: number; lng: number }> =>
        new Promise(resolve => {
          if (!navigator.geolocation) {
            resolve({ lat: 35.6896, lng: 139.7006 })
            return
          }
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 35.6896, lng: 139.7006 }),
            { timeout: 5000 }
          )
        })

      const center = await getInitialCenter()
      if (cancelled) return

      const map = new google.maps.Map(containerRef.current!, {
        center,
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: darkMapStyles,
        gestureHandling: 'greedy',
        clickableIcons: false,
        renderingType: google.maps.RenderingType.RASTER,
      })
      mapRef.current = map
      infoWindowRef.current = new google.maps.InfoWindow()


      map.addListener('click', () => {
        infoWindowRef.current?.close()
      })

      map.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        onMapClick(e.latLng.lat(), e.latLng.lng())
      })

      map.addListener('zoom_changed', () => {
        const zoom = map.getZoom() ?? 0
        if (zoomLabelRef.current) zoomLabelRef.current.textContent = `zoom: ${zoom}`
        if (zoom >= 15) {
          loadNearbyPOI(map)
        } else {
          clearPoiMarkers()
        }
      })

      onPanReady((lat, lng, zoom) => {
        map.panTo({ lat, lng })
        if (zoom !== undefined) map.setZoom(zoom)
      })
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync markers from props to google markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const currentIds = new Set(markers.map(m => m.id))
    markerMapRef.current.forEach((gm, id) => {
      if (!currentIds.has(id)) {
        gm.setMap(null)
        markerMapRef.current.delete(id)
      }
    })

    markers.forEach(md => {
      if (markerMapRef.current.has(md.id)) return
      const emoji = MARKER_STYLE_EMOJI[md.style]
      const gm = new google.maps.Marker({
        position: { lat: md.lat, lng: md.lng },
        map,
        icon: {
          url: createEmojiIcon(emoji),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 36),
        },
        title: md.note,
      })
      gm.addListener('click', () => {
        if (!infoWindowRef.current) return
        infoWindowRef.current.setContent(
          `<div style="color:#000;padding:8px;min-width:160px"><div style="font-size:28px;text-align:center">${emoji}</div><p style="margin:6px 0 0;font-size:13px">${md.note || '暂无备注'}</p></div>`
        )
        infoWindowRef.current.open(map, gm)
      })
      markerMapRef.current.set(md.id, gm)
    })
  }, [markers])

  // Focus a marker from the sidebar
  useEffect(() => {
    if (!focusTarget || !mapRef.current) return
    const map = mapRef.current
    map.panTo({ lat: focusTarget.lat, lng: focusTarget.lng })
    map.setZoom(16)
    const gm = markerMapRef.current.get(focusTarget.id)
    if (gm && infoWindowRef.current) {
      const emoji = MARKER_STYLE_EMOJI[focusTarget.style]
      infoWindowRef.current.setContent(
        `<div style="color:#000;padding:8px;min-width:160px"><div style="font-size:28px;text-align:center">${emoji}</div><p style="margin:6px 0 0;font-size:13px">${focusTarget.note || '暂无备注'}</p></div>`
      )
      infoWindowRef.current.open(map, gm)
    }
    onFocusComplete()
  }, [focusTarget, onFocusComplete])

  // Show temporary search result marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null)
      searchMarkerRef.current = null
    }
    if (!searchResult) return

    const marker = new google.maps.Marker({
      position: { lat: searchResult.lat, lng: searchResult.lng },
      map,
      title: searchResult.name,
      icon: {
        url: createSearchPinIcon(),
        scaledSize: new google.maps.Size(32, 44),
        anchor: new google.maps.Point(16, 44),
      },
    })
    searchMarkerRef.current = marker

    marker.addListener('rightclick', () => {
      onMapClick(searchResult.lat, searchResult.lng, searchResult.name)
    })

    const content = `<div style="color:#000;padding:8px;min-width:200px;font-family:sans-serif">
      <p style="margin:0 0 4px;font-size:14px;font-weight:bold">${searchResult.name}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#555">${searchResult.address}</p>
      ${searchResult.placeId
        ? `<a href="https://www.google.com/maps/place/?q=place_id:${searchResult.placeId}" target="_blank" style="font-size:12px;color:#1a73e8">在 Google Maps 查看 →</a>`
        : ''}
    </div>`

    marker.addListener('click', () => {
      if (!infoWindowRef.current) return
      infoWindowRef.current.setContent(content)
      infoWindowRef.current.open(map, marker)
    })

    if (infoWindowRef.current) {
      infoWindowRef.current.setContent(content)
      infoWindowRef.current.open(map, marker)
    }
  }, [searchResult])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} data-testid="map-container" className="w-full h-full" />
      <div
        ref={zoomLabelRef}
        className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none"
      >
        zoom: --
      </div>
    </div>
  )
}
