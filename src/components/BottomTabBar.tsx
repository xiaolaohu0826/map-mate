'use client'

import { Map, Route } from 'lucide-react'

export type Tab = 'map' | 'footprint'

interface BottomTabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <div className="h-14 bg-gray-900 border-t border-gray-800 flex items-stretch flex-shrink-0">
      <button
        onClick={() => onTabChange('map')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeTab === 'map' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-xs">探索</span>
      </button>
      <button
        onClick={() => onTabChange('footprint')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeTab === 'footprint' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Route className="w-5 h-5" />
        <span className="text-xs">足迹</span>
      </button>
    </div>
  )
}
