import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import NotesSidebar from '@/components/NotesSidebar'
import { MarkerData } from '@/types'

const mockMarkers: MarkerData[] = [
  { id: '1', lat: 31.23, lng: 121.47, style: 'heart', note: '第一个地点', created_at: '' },
  { id: '2', lat: 31.24, lng: 121.48, style: 'dart', note: '第二个地点', created_at: '' },
  { id: '3', lat: 31.25, lng: 121.49, style: 'pin', note: '', created_at: '' },
]

const defaultProps = {
  open: false,
  onToggle: jest.fn(),
  markers: mockMarkers,
  onMarkerFocus: jest.fn(),
}

describe('NotesSidebar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders toggle button', () => {
    render(<NotesSidebar {...defaultProps} />)
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument()
  })

  it('renders sidebar panel', () => {
    render(<NotesSidebar {...defaultProps} />)
    expect(screen.getByTestId('notes-sidebar')).toBeInTheDocument()
  })

  it('sidebar is hidden when closed', () => {
    render(<NotesSidebar {...defaultProps} open={false} />)
    expect(screen.getByTestId('notes-sidebar').className).toMatch(/-translate-x-full/)
  })

  it('sidebar is visible when open', () => {
    render(<NotesSidebar {...defaultProps} open={true} />)
    expect(screen.getByTestId('notes-sidebar').className).toMatch(/translate-x-0/)
  })

  it('calls onToggle when button clicked', () => {
    const onToggle = jest.fn()
    render(<NotesSidebar {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByTestId('sidebar-toggle'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('renders correct number of marker items', () => {
    render(<NotesSidebar {...defaultProps} open={true} />)
    expect(screen.getByTestId('marker-list').children).toHaveLength(mockMarkers.length)
  })

  it('matches marker count in list to mock data length', () => {
    render(<NotesSidebar {...defaultProps} open={true} />)
    const items = screen.getAllByRole('button').filter(
      b => b.getAttribute('data-testid')?.startsWith('note-item-')
    )
    expect(items).toHaveLength(mockMarkers.length)
  })

  it('calls onMarkerFocus with correct marker when item clicked', () => {
    const onMarkerFocus = jest.fn()
    render(<NotesSidebar {...defaultProps} open={true} onMarkerFocus={onMarkerFocus} />)
    fireEvent.click(screen.getByTestId('note-item-2'))
    expect(onMarkerFocus).toHaveBeenCalledWith(mockMarkers[1])
  })

  it('shows empty state when no markers', () => {
    render(<NotesSidebar {...defaultProps} markers={[]} open={true} />)
    expect(screen.getByText(/还没有标记/)).toBeInTheDocument()
  })

  it('shows fallback text for empty note', () => {
    render(<NotesSidebar {...defaultProps} open={true} />)
    expect(screen.getByText('无备注')).toBeInTheDocument()
  })

  it('shows marker count badge', () => {
    render(<NotesSidebar {...defaultProps} open={true} />)
    expect(screen.getByText(String(mockMarkers.length))).toBeInTheDocument()
  })
})
