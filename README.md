# payload-plugin-visual-editor

Inline visual editing for [Payload CMS](https://payloadcms.com) live preview.

![Payload admin preview toolbar closed](media/toolbar-menu-closed.png)
![Payload admin preview toolbar opened](media/toolbar-menu-opened.png)

Edit text directly in the preview iframe. Changes sync back to the admin document form and save as a draft when you click **Done**.

<details>
<summary><b>Demo video</b> — click to expand (~9 MB, loads on demand)</summary>
<br>

<video controls preload="none" poster="media/video-poster.png" width="720">
  <source src="media/payload-visual-editor.mp4" type="video/mp4">
  <a href="media/payload-visual-editor.mp4">Play or download demo</a>
</video>

</details>

## Features

- Edit **text**, **textarea**, **number**, and **richText** fields from the live preview
- Automatic text matching — no `data-*` attributes or field wrappers in your frontend
- Case-insensitive matching (e.g. CSS `text-transform: uppercase` on titles)
- **Edit / Done** control in the admin document bar when live preview is active
- Commits in-progress edits and saves a **draft** when you click **Done**
- Per-collection allowlists and blocklists for field paths

## Requirements

- Payload `^3.84.0`
- `@payloadcms/ui` and `@payloadcms/live-preview` (peer dependencies)
- [Live preview](https://payloadcms.com/docs/live-preview) configured on the collection
- `VisualEditorListener` mounted in the frontend layout used for preview URLs

## Installation

```bash
pnpm add payload-plugin-visual-editor
```

## Setup

### 1. Register the plugin

```ts
import { payloadVisualEditor } from 'payload-plugin-visual-editor'

export default buildConfig({
  plugins: [
    payloadVisualEditor({
      collections: {
        // Enable all editable field types for this collection
        articles: true,

        // Or restrict which fields can be edited in the preview
        'static-pages': {
          excludeFields: ['slug'],
        },

        // Allowlist only specific paths
        pages: {
          fields: ['title', 'hero.body'],
        },
      },

      // Optional — defaults to text, textarea, number, richText
      editableFieldTypes: ['text', 'textarea', 'number', 'richText'],
    }),
  ],
})
```

The plugin registers the **Edit / Done** admin control automatically. You do not need to wire admin components manually.

After adding the plugin, regenerate your project's import map so Payload can resolve the admin UI:

```bash
payload generate:importmap
```

### 2. Enable live preview on a collection

```ts
export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    livePreview: {
      url: ({ data }) => `/articles/${data?.slug}?payloadLivePreview=true`,
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },
  ],
}
```

Preview URLs must be served by the same frontend layout where you mount `VisualEditorListener`.

### 3. Mount the frontend listener

Add the listener once to the root layout of your live-preview frontend (not the admin layout):

```tsx
import { VisualEditorListener } from 'payload-plugin-visual-editor/client'

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

### Collection options

| Value                          | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `true`                         | All fields matching `editableFieldTypes` are editable |
| `{ fields?: string[] }`        | Only these dot-paths (e.g. `meta.title`)              |
| `{ excludeFields?: string[] }` | Remove paths from the editable set (e.g. `slug`)      |

## Usage

1. Open a document that has **live preview** enabled.
2. Click **Edit** in the admin bar (next to save / draft controls).
3. In the preview, hover text that matches a configured field — it is outlined in blue.
4. Click to edit inline, then blur to apply the change to the form.
5. Click **Done** to exit edit mode, commit any active edit, and save the document as a **draft**.

Edits update the admin form immediately. Draft saves are debounced while editing; **Done** flushes any pending save.

### Live preview pages with React state

If your preview page subscribes to `@payloadcms/live-preview` and stores document data in React state, pause updates while the user is editing. Otherwise incoming preview events will re-render the page, wipe `contenteditable` state, and lose the cursor.

Use the hooks exported from the client entry:

```tsx
'use client'

import { subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useVisualEditorEditMode, useVisualEditorMode } from 'payload-plugin-visual-editor/client'
import { useEffect, useRef, useState } from 'react'

export function ArticlePreview({ initialArticle, serverURL }) {
  const isLivePreview = useVisualEditorMode()
  const isVisualEditing = useVisualEditorEditMode()
  const [article, setArticle] = useState(initialArticle)
  const pendingRef = useRef<typeof initialArticle | null>(null)
  const editingRef = useRef(isVisualEditing)
  editingRef.current = isVisualEditing

  useEffect(() => {
    if (!isLivePreview) return

    const listener = subscribe({
      callback: (data) => {
        if (editingRef.current) {
          pendingRef.current = data
          return
        }
        setArticle(data)
      },
      initialData: initialArticle,
      serverURL,
    })

    return () => unsubscribe(listener)
  }, [initialArticle, isLivePreview, serverURL])

  useEffect(() => {
    if (!isVisualEditing && pendingRef.current) {
      setArticle(pendingRef.current)
      pendingRef.current = null
    }
  }, [isVisualEditing])

  return (
    <article>
      <h1>{article.title}</h1>
      {/* render other fields */}
    </article>
  )
}
```

See `dev/components/PostPreview.tsx` in this repo for a full working example.

### How matching works

The listener loads editable field paths from the plugin API, subscribes to live-preview document data, and builds a lookup from field values (including rich text plain text and paragraph segments). Visible DOM text is matched case-insensitively.

Your templates only need to render the same text as stored in Payload — no special markup. Text that does not appear in the DOM (hidden fields, computed-only values) cannot be edited visually.

## API

### `GET /api/visual-editor/fields?collection={slug}`

Returns editable field descriptors for an enabled collection.

```json
{
  "collection": "articles",
  "fields": [
    { "path": "title", "type": "text" },
    { "path": "richContent", "type": "richText" }
  ]
}
```

Returns `400` if the collection is not enabled for visual editing.

## Exports

| Import                                | Description                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `payload-plugin-visual-editor`        | Plugin (`payloadVisualEditor`) and types                                      |
| `payload-plugin-visual-editor/client` | `VisualEditorListener`, hooks, `VisualEditorAdmin` (registered by the plugin) |
| `payload-plugin-visual-editor/rsc`    | Re-exports for RSC-compatible setups                                          |

## Troubleshooting

| Issue                           | What to check                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Edit** button missing         | Collection enabled in `payloadVisualEditor({ collections })` and live preview configured        |
| No blue outlines in preview     | `VisualEditorListener` mounted in the preview frontend layout; field text is visible in the DOM |
| Edits lost while typing         | Preview page re-renders on live-preview updates — use the pause/flush pattern above             |
| Admin build error after install | Run `payload generate:importmap` in your project                                                |

## Contributing

This repository is also a Payload plugin template. For local development, testing, and release workflow, see [development.sketch.md](./development.sketch.md).

### Local development setup

The plugin's source lives in `src/`, but the dev app in `dev/` (and Payload's auto-generated `dev/app/(payload)/admin/importMap.js`) imports it under its **published** name — `payload-plugin-visual-editor/client` and `payload-plugin-visual-editor/rsc` — so the dev environment mirrors what consumers see in their own projects.

Because the plugin is not actually installed in `node_modules` during local development, those subpath imports are wired up through two small pieces of glue (instead of a `link:.` self-dependency in `package.json`, which would pollute the published manifest):

- **`dev/tsconfig.json`** — `compilerOptions.paths` maps `payload-plugin-visual-editor`, `…/client`, and `…/rsc` to the matching files under `../src/`. This is what TypeScript and editors use for type checking and go-to-definition.
- **`dev/next.config.mjs`** — `turbopack.resolveAlias` and `webpack.resolve.alias` map the `/client` and `/rsc` subpaths to the same source files at runtime, so both `pnpm dev --turbo` and the standard webpack build resolve them without a real package install.

`dev/payload.config.ts` is loaded by the Payload CLI (Node, not Next), so it imports `payloadVisualEditor` via a plain relative path (`../src/index.js`) — Node never sees the package name.

If you add a new public entry point under `src/exports/`, update both the tsconfig paths and the alias map in `dev/next.config.mjs` to keep the dev app resolving it.

## License

MIT

## Note

This is open source work for self hosted Payload CMS instances. This plugin has no relation to the official Payload CMS [enterprise visual editor](https://payloadcms.com/enterprise/visual-editor).
