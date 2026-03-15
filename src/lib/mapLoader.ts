import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let configured = false

function configure(): void {
  if (configured) return
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    v: 'weekly',
  })
  configured = true
}

export async function loadMaps(): Promise<google.maps.MapsLibrary> {
  configure()
  return importLibrary('maps') as Promise<google.maps.MapsLibrary>
}

export async function loadPlaces(): Promise<google.maps.PlacesLibrary> {
  configure()
  return importLibrary('places') as Promise<google.maps.PlacesLibrary>
}

/** Reset configured state — only for use in tests */
export function resetMapLoader(): void {
  configured = false
}
