import type { Metadata } from 'next'
import { Lora } from 'next/font/google'
import './globals.css'

const lora = Lora({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Synth Data Gen',
  description: 'Generate realistic synthetic datasets for ML, AI, and data practice',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lora.className}>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <nav className="border-b border-slate-800 px-4 py-3">
          <span className="font-semibold text-lg tracking-tight">Synth Data Gen</span>
        </nav>
        <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
