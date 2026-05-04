import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Adrien Casse — Data Scientist · Paris',
  description: 'Parle directement à Adrien Casse — Data Scientist, M2 Économétrie Lyon 2, GCP en production. Propulsé par un pipeline RAG maison.',
  openGraph: {
    title: 'Adrien Casse AI',
    description: 'Pose tes questions à un chatbot qui connaît vraiment Adrien.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
