# payload-visual-editor

Inline visual editing for Payload CMS live preview. Edit text on the preview page; changes sync back to the admin document form.

## Setup

```ts
import { payloadVisualEditor } from 'payload-visual-editor'

export default buildConfig({
  plugins: [
    payloadVisualEditor({
      collections: {
        articles: true,
        'static-pages': true,
      },
      // optional — defaults to text, textarea, number, richText
      editableFieldTypes: ['text', 'textarea', 'number', 'richText'],
    }),
  ],
})
```

Add the listener once to your frontend root layout:

```tsx
import { VisualEditorListener } from 'payload-visual-editor/client'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <VisualEditorListener />
      </body>
    </html>
  )
}
```

For Next.js, transpile the package and allow ESM subpath imports:

```js
// next.config.js
const nextConfig = {
  transpilePackages: ['payload-visual-editor'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.m?js$/,
      include: /payload-visual-editor/,
      resolve: { fullySpecified: false },
    })
    return config
  },
}
```

Run `pnpm build` in the plugin package when linking locally via `file:`.

## Usage

1. Open a document with live preview enabled.
2. In the preview iframe, click the **Edit** button (bottom-right).
3. Hover matching text (outlined), click to edit, blur or Enter to save.
4. Save/publish the document in the admin as usual.

Matching works by comparing visible text to live-preview field values for enabled field types. No wrappers or `data-*` attributes are required in your frontend templates.

## API

- `GET /api/visual-editor/fields?collection={slug}` — lists editable field paths for an enabled collection.
