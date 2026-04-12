import type { Metadata } from 'next'

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
      <body style={{ margin: 0, padding: 0, background: '#020617' }}>
        {children}
      </body>
    </html>
  )
}
