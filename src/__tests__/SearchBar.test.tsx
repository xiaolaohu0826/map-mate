import React from 'react'
import { render, screen, act } from '@testing-library/react'
import SearchBar from '@/components/SearchBar'

const mockAutocomplete = {
  addListener: jest.fn((_event: string, cb: Function) => {
    if (_event === 'place_changed') {
      // store for later trigger
      ;(mockAutocomplete as any)._cb = cb
    }
  }),
  getPlace: jest.fn(() => ({
    geometry: { location: { lat: () => 31.23, lng: () => 121.47 } },
    name: 'Test Place',
  })),
}

const mockGoogle = {
  maps: {
    places: {
      Autocomplete: jest.fn(() => mockAutocomplete),
    },
  },
}

jest.mock('@/lib/mapLoader', () => ({
  loadPlaces: jest.fn().mockImplementation(() =>
    Promise.resolve({
      Autocomplete: jest.fn(() => mockAutocomplete),
    })
  ),
}))

// google.maps.importLibrary is called inside the geocoding fallback
beforeAll(() => {
  ;(global as any).google = {
    maps: {
      importLibrary: jest.fn().mockResolvedValue({
        Geocoder: jest.fn().mockImplementation(() => ({
          geocode: jest.fn().mockResolvedValue({ results: [] }),
        })),
      }),
    },
  }
})

afterAll(() => {
  delete (global as any).google
})

describe('SearchBar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders search input', async () => {
    await act(async () => {
      render(<SearchBar onPlaceSelected={jest.fn()} />)
    })
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
  })

  it('has correct placeholder', async () => {
    await act(async () => {
      render(<SearchBar onPlaceSelected={jest.fn()} />)
    })
    expect(screen.getByPlaceholderText('搜索地点...')).toBeInTheDocument()
  })
})
