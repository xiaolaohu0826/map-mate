export type MarkerStyle = 'dart' | 'pin' | 'heart'

export interface MarkerData {
  id: string
  lat: number
  lng: number
  style: MarkerStyle
  note: string
  created_at: string
}

export const MARKER_STYLE_EMOJI: Record<MarkerStyle, string> = {
  dart: '🎯',
  pin: '📍',
  heart: '❤️',
}

export const MARKER_STYLES: MarkerStyle[] = ['dart', 'pin', 'heart']
