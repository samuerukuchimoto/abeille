import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'abeille',
  description: 'Post a real need. One connection. 24 hours.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}