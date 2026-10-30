import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Visual AI Agent Workflow Builder (DAG Engine)',
  description: 'Asynchronous DAG execution engine with conditional branching and AI LLM nodes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  )
}
