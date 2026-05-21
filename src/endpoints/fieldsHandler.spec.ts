import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { createFieldsEndpoint } from './fieldsHandler.js'
import type { VisualEditorPluginState } from './fieldsHandler.js'

function createMockRequest(overrides: {
  collection?: string
  fields?: { name: string; type: 'text' | 'textarea' | 'number' | 'richText' }[]
}): PayloadRequest {
  const collection = overrides.collection ?? 'posts'
  const fields = overrides.fields ?? [
    { name: 'title', type: 'text' },
    { name: 'slug', type: 'text' },
    { name: 'views', type: 'number' },
  ]

  return {
    query: { collection },
    payload: {
      collections: {
        [collection]: {
          config: { fields },
        },
      },
    },
  } as unknown as PayloadRequest
}

describe('createFieldsEndpoint', () => {
  const pluginState: VisualEditorPluginState = {
    collections: new Map([
      ['posts', true],
      ['pages', { fields: ['title'] }],
      ['articles', { excludeFields: ['slug'] }],
    ]),
    editableFieldTypes: ['text', 'textarea', 'number', 'richText'],
  }

  const endpoint = createFieldsEndpoint(pluginState)

  it('returns 400 when collection slug is missing', async () => {
    const response = await endpoint.handler!(
      { query: {}, payload: { collections: {} } } as unknown as PayloadRequest,
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Collection slug is required' })
  })

  it('returns 400 when collection is not enabled', async () => {
    const response = await endpoint.handler!(createMockRequest({ collection: 'users' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Collection is not enabled for visual editing',
    })
  })

  it('returns 404 when collection schema is missing', async () => {
    const req = createMockRequest({ collection: 'posts' })
    ;(req.payload.collections as Record<string, unknown>).posts = undefined

    const response = await endpoint.handler!(req)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Collection not found' })
  })

  it('returns all editable fields when collection config is true', async () => {
    const response = await endpoint.handler!(createMockRequest({ collection: 'posts' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      collection: 'posts',
      fields: [
        { path: 'title', type: 'text' },
        { path: 'slug', type: 'text' },
        { path: 'views', type: 'number' },
      ],
    })
  })

  it('filters to allowed field paths when configured', async () => {
    const response = await endpoint.handler!(createMockRequest({ collection: 'pages' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.fields).toEqual([{ path: 'title', type: 'text' }])
  })

  it('excludes configured field paths', async () => {
    const response = await endpoint.handler!(createMockRequest({ collection: 'articles' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.fields).toEqual([
      { path: 'title', type: 'text' },
      { path: 'views', type: 'number' },
    ])
  })
})
