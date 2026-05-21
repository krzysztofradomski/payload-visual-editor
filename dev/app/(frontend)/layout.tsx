import { VisualEditorListener } from 'payload-visual-editor/client'
import type { ReactNode } from 'react'

import './globals.css'

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/posts">Posts</a>
        </header>
        <main className="site-main">{children}</main>
        <VisualEditorListener />
      </body>
    </html>
  )
}
