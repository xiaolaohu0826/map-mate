import React from 'react'
import { render, screen, act } from '@testing-library/react'
import MapWrapper from '@/components/MapWrapper'
import { MarkerData } from '@/types'

// These const objects are referenced lazily inside mockImplementation,
// so they're initialized before the mocks are ever invoked.
const mockMap = {
  addListener: jest.fn(),
  panTo: jest.fn(),
  setZoom: jest.fn(),
  getCenter: jest.fn(() => ({ lat: () => 31.23, lng: () => 121.47 })),
  getZoom: jest.fn(() => 12),
}

const mockMarker = {
  setMap: jest.fn(),
  addListener: jest.fn(),
}

const mockInfoWindow = {
  open: jest.fn(),
  setContent: jest.fn(),
}

const mockPlacesService = {
  nearbySearch: jest.fn((_req: unknown, cb: Function) => cb([], 'ZERO_RESULTS')),
}

// Use mockImplementation so inner objects are created on call, not at setup time.
jest.mock('@/lib/mapLoader', () => ({
  loadMaps: jest.fn().mockImplementation(() =>
    Promise.resolve({
      Map: jest.fn(() => mockMap),
      Marker: jest.fn(() => mockMarker),
      InfoWindow: jest.fn(() => mockInfoWindow),
      Size: jest.fn((w: number, h: number) => ({ w, h })),
      Point: jest.fn((x: number, y: number) => ({ x, y })),
    })
  ),
  loadPlaces: jest.fn().mockImplementation(() =>
    Promise.resolve({
      PlacesService: jest.fn(() => mockPlacesService),
      PlacesServiceStatus: { OK: 'OK' },
      Autocomplete: jest.fn(() => ({ addListener: jest.fn(), getPlace: jest.fn() })),
    })
  ),
  resetMapLoader: jest.fn(),
}))

jest.mock('@/lib/mapStyles', () => ({ darkMapStyles: [] }))

beforeAll(() => {
  ;(global as any).google = {
    maps: {
      importLibrary: jest.fn().mockResolvedValue({}),
      Map: jest.fn(() => mockMap),
      Marker: jest.fn(() => mockMarker),
      InfoWindow: jest.fn(() => mockInfoWindow),
      Size: jest.fn((w: number, h: number) => ({ w, h })),
      Point: jest.fn((x: number, y: number) => ({ x, y })),
      RenderingType: { RASTER: 'RASTER', VECTOR: 'VECTOR' },
      ImageMapType: jest.fn(() => ({})),
    },
  }
})

afterAll(() => {
  delete (global as any).google
})

const defaultProps = {
  markers: [] as MarkerData[],
  onMapClick: jest.fn(),
  focusTarget: null,
  onFocusComplete: jest.fn(),
  onPanReady: jest.fn(),
  searchResult: null,
  onSearchResultClear: jest.fn(),
}

describe('MapWrapper', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders map container', () => {
    render(<MapWrapper {...defaultProps} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('initializes map and sets up event listeners', async () => {
    await act(async () => {
      render(<MapWrapper {...defaultProps} />)
    })
    // Map was created and rightclick + zoom_changed listeners attached
    expect(mockMap.addListener).toHaveBeenCalledWith('rightclick', expect.any(Function))
    expect(mockMap.addListener).toHaveBeenCalledWith('zoom_changed', expect.any(Function))
  })

  it('calls onPanReady with a pan function', async () => {
    const onPanReady = jest.fn()
    await act(async () => {
      render(<MapWrapper {...defaultProps} onPanReady={onPanReady} />)
    })
    expect(onPanReady).toHaveBeenCalledWith(expect.any(Function))
  })

  it('creates Marker for each item in markers prop', async () => {
    const markers: MarkerData[] = [
      { id: '1', lat: 31.23, lng: 121.47, style: 'heart', note: 'Test', created_at: '' },
    ]
    const { rerender } = await act(async () =>
      render(<MapWrapper {...defaultProps} markers={[]} />)
    )
    await act(async () => {
      rerender(<MapWrapper {...defaultProps} markers={markers} />)
    })
    // Marker was created with a click listener
    expect(mockMarker.addListener).toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('handles focusTarget and calls onFocusComplete', async () => {
    const focusTarget: MarkerData = {
      id: '1', lat: 31.23, lng: 121.47, style: 'heart', note: 'hi', created_at: '',
    }
    const onFocusComplete = jest.fn()
    const markers: MarkerData[] = [focusTarget]

    const { rerender } = await act(async () =>
      render(<MapWrapper {...defaultProps} markers={markers} focusTarget={null} onFocusComplete={onFocusComplete} />)
    )
    await act(async () => {
      rerender(
        <MapWrapper {...defaultProps} markers={markers} focusTarget={focusTarget} onFocusComplete={onFocusComplete} />
      )
    })
    expect(onFocusComplete).toHaveBeenCalled()
  })
})
