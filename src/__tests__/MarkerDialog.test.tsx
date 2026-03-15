import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MarkerDialog from '@/components/MarkerDialog'

const defaultProps = {
  open: true,
  lat: 31.23456,
  lng: 121.47891,
  onSave: jest.fn(),
  onClose: jest.fn(),
}

describe('MarkerDialog', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders nothing when closed', () => {
    render(<MarkerDialog {...defaultProps} open={false} />)
    expect(screen.queryByTestId('marker-dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    render(<MarkerDialog {...defaultProps} />)
    expect(screen.getByTestId('marker-dialog')).toBeInTheDocument()
  })

  it('shows coordinate info', () => {
    render(<MarkerDialog {...defaultProps} />)
    expect(screen.getByText(/31.23456/)).toBeInTheDocument()
  })

  it('renders all three style buttons', () => {
    render(<MarkerDialog {...defaultProps} />)
    expect(screen.getByTestId('style-btn-dart')).toBeInTheDocument()
    expect(screen.getByTestId('style-btn-pin')).toBeInTheDocument()
    expect(screen.getByTestId('style-btn-heart')).toBeInTheDocument()
  })

  it('changes selected style on click', () => {
    render(<MarkerDialog {...defaultProps} />)
    const dartBtn = screen.getByTestId('style-btn-dart')
    fireEvent.click(dartBtn)
    expect(dartBtn.className).toMatch(/ring-2/)
  })

  it('updates note input', () => {
    render(<MarkerDialog {...defaultProps} />)
    const textarea = screen.getByTestId('note-input')
    fireEvent.change(textarea, { target: { value: '这里很美' } })
    expect(textarea).toHaveValue('这里很美')
  })

  it('calls onSave with style and note when save clicked', () => {
    const onSave = jest.fn()
    render(<MarkerDialog {...defaultProps} onSave={onSave} />)
    fireEvent.change(screen.getByTestId('note-input'), { target: { value: '测试备注' } })
    fireEvent.click(screen.getByTestId('style-btn-dart'))
    fireEvent.click(screen.getByTestId('save-btn'))
    expect(onSave).toHaveBeenCalledWith('dart', '测试备注')
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn()
    render(<MarkerDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('cancel-btn'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button clicked', () => {
    const onClose = jest.fn()
    render(<MarkerDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(onClose).toHaveBeenCalled()
  })

  it('resets note after save', () => {
    render(<MarkerDialog {...defaultProps} />)
    const textarea = screen.getByTestId('note-input')
    fireEvent.change(textarea, { target: { value: '临时文字' } })
    fireEvent.click(screen.getByTestId('save-btn'))
    expect(textarea).toHaveValue('')
  })
})
