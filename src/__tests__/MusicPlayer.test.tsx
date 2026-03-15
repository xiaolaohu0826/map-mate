import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import MusicPlayer from '@/components/MusicPlayer'

const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  src: '',
  volume: 1,
  addEventListener: jest.fn((_ev: string, cb: Function) => {
    if (_ev === 'ended') (mockAudio as any)._endedCb = cb
  }),
  removeEventListener: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'Audio', {
    writable: true,
    value: jest.fn(() => mockAudio),
  })
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve(['song1.mp3', 'song2.mp3', 'song3.mp3']),
  }) as jest.Mock
})

describe('MusicPlayer', () => {
  it('renders play button', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    expect(screen.getByTestId('play-pause-btn')).toBeInTheDocument()
  })

  it('renders mute button', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    expect(screen.getByTestId('mute-btn')).toBeInTheDocument()
  })

  it('toggles playing state on play button click', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    const btn = screen.getByTestId('play-pause-btn')
    // initially not playing — shows Play icon
    expect(btn.querySelector('svg')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(btn)
    })
    // after click, playing
    expect(mockAudio.play).toHaveBeenCalled()
  })

  it('toggles mute state on mute button click', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    const muteBtn = screen.getByTestId('mute-btn')
    fireEvent.click(muteBtn)
    // volume should be set to 0
    expect(mockAudio.volume).toBe(0)
  })

  it('shows expand panel when music icon clicked', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    expect(screen.queryByTestId('volume-slider')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('expand-btn'))
    expect(screen.getByTestId('volume-slider')).toBeInTheDocument()
  })

  it('updates volume on slider change', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    fireEvent.click(screen.getByTestId('expand-btn'))
    const slider = screen.getByTestId('volume-slider')
    fireEvent.change(slider, { target: { value: '0.8' } })
    expect(mockAudio.volume).toBe(0.8)
  })

  it('pauses audio when play toggled twice', async () => {
    await act(async () => {
      render(<MusicPlayer />)
    })
    const btn = screen.getByTestId('play-pause-btn')
    await act(async () => { fireEvent.click(btn) }) // play
    await act(async () => { fireEvent.click(btn) }) // pause
    expect(mockAudio.pause).toHaveBeenCalled()
  })
})
