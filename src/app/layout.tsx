import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '猪影迷踪',
  description: '异地恋情侣的专属地图协作平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="antialiased">{children}</body>
    </html>
  )
}
