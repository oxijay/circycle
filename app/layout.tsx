import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ระบบจัดการกระบวนการรีไซเคิล',
  description: 'ระบบจัดการขั้นตอนการรีไซเคิลวัสดุเหลือใช้จากโรงงาน',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  )
}