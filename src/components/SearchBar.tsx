'use client'

import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { loadPlaces } from '@/lib/mapLoader'

interface SearchBarProps {
  onPlaceSelected: (lat: number, lng: number, name: string) => void
}

export default function SearchBar({ onPlaceSelected }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!inputRef.current) return
    let cancelled = false

    const init = async () => {
      const placesLib = await loadPlaces()
      if (cancelled || !inputRef.current) return

      const { Autocomplete } = placesLib
      const autocomplete = new Autocomplete(inputRef.current, {
        fields: ['geometry', 'name'],
      })

      autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace()
        if (place.geometry?.location) {
          onPlaceSelected(
            place.geometry.location.lat(),
            place.geometry.location.lng(),
            place.name ?? ''
          )
        } else if (place.name) {
          // Enter pressed without selecting dropdown — fall back to Geocoder
          try {
            const { Geocoder } = await google.maps.importLibrary('geocoding') as google.maps.GeocodingLibrary
            const geocoder = new Geocoder()
            const result = await geocoder.geocode({ address: place.name })
            const loc = result.results?.[0]?.geometry?.location
            if (loc) {
              onPlaceSelected(loc.lat(), loc.lng(), result.results[0].formatted_address ?? place.name)
              if (inputRef.current) inputRef.current.value = result.results[0].formatted_address ?? place.name
            }
          } catch (e) {
            console.warn('Geocoding failed:', e)
          }
        }
      })
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-80">
      <div className="relative flex items-center bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-700">
        <Search className="absolute left-3 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索地点..."
          data-testid="search-input"
          className="w-full bg-transparent text-white placeholder-gray-400 py-2 pl-10 pr-4 rounded-full outline-none text-sm"
        />
      </div>
    </div>
  )
}
