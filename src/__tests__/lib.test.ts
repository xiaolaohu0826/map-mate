import { loadMaps, loadPlaces, resetMapLoader } from '@/lib/mapLoader'
import { MARKER_STYLE_EMOJI, MARKER_STYLES } from '@/types'
import { darkMapStyles } from '@/lib/mapStyles'

const mockSetOptions = jest.fn()
const mockMapsLib = { Map: jest.fn(), Marker: jest.fn() }
const mockPlacesLib = { PlacesService: jest.fn(), Autocomplete: jest.fn() }
const mockImportLibrary = jest.fn((lib: string) =>
  Promise.resolve(lib === 'maps' ? mockMapsLib : mockPlacesLib)
)

jest.mock('@googlemaps/js-api-loader', () => ({
  setOptions: (...args: unknown[]) => mockSetOptions(...args),
  importLibrary: (...args: unknown[]) => mockImportLibrary(...args),
}))

describe('mapLoader', () => {
  beforeEach(() => {
    resetMapLoader()
    mockSetOptions.mockClear()
    mockImportLibrary.mockClear()
  })

  it('loadMaps calls setOptions with key and returns MapsLibrary', async () => {
    const lib = await loadMaps()
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.any(String) })
    )
    expect(mockImportLibrary).toHaveBeenCalledWith('maps')
    expect(lib).toBe(mockMapsLib)
  })

  it('loadPlaces returns PlacesLibrary', async () => {
    const lib = await loadPlaces()
    expect(mockImportLibrary).toHaveBeenCalledWith('places')
    expect(lib).toBe(mockPlacesLib)
  })

  it('setOptions is only called once across multiple loadMaps calls', async () => {
    await loadMaps()
    await loadMaps()
    expect(mockSetOptions).toHaveBeenCalledTimes(1)
  })

  it('after resetMapLoader, setOptions is called again', async () => {
    await loadMaps()
    resetMapLoader()
    await loadMaps()
    expect(mockSetOptions).toHaveBeenCalledTimes(2)
  })
})

describe('types', () => {
  it('has three marker styles', () => {
    expect(MARKER_STYLES).toHaveLength(3)
  })

  it('has emoji for each style', () => {
    MARKER_STYLES.forEach(s => {
      expect(MARKER_STYLE_EMOJI[s]).toBeDefined()
    })
  })
})

describe('mapStyles', () => {
  it('exports a non-empty styles array', () => {
    expect(darkMapStyles.length).toBeGreaterThan(0)
  })
})
