import type { PayloadRequest } from 'payload'

import { describe, expect, it } from 'vitest'

import type { VisualEditorCollectionConfig } from '../types.js'
import type { VisualEditorPluginState } from './fieldsHandler.js'

import { createFieldsEndpoint } from './fieldsHandler.js'

function createMockRequest(overrides: {
  collection?: string
  fields?: { name: string; type: 'number' | 'richText' | 'text' | 'textarea' }[]
}): PayloadRequest {
  const collection = overrides.collection ?? 'posts'
  const fields = overrides.fields ?? [
    { name: 'title', type: 'text' },
    { name: 'slug', type: 'text' },
    { name: 'views', type: 'number' },
  ]

  return {
    payload: {
      collections: {
        [collection]: {
          config: { fields },
        },
      },
    },
    query: { collection },
  } as unknown as PayloadRequest
}

describe('createFieldsEndpoint', () => {
  const pluginState: VisualEditorPluginState = {
    collections: new Map<string, VisualEditorCollectionConfig>([
      ['articles', { excludeFields: ['slug'] }],
      ['pages', { fields: ['title'] }],
      ['posts', true],
    ]),
    editableFieldTypes: ['text', 'textarea', 'number', 'richText'],
  }

  const endpoint = createFieldsEndpoint(pluginState)

  it('returns 400 when collection slug is missing', async () => {
    const response = await endpoint.handler({
      payload: { collections: {} },
      query: {},
    } as unknown as PayloadRequest)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Collection slug is required' })
  })

  it('returns 400 when collection is not enabled', async () => {
    const response = await endpoint.handler(createMockRequest({ collection: 'users' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Collection is not enabled for visual editing',
    })
  })

  it('returns 404 when collection schema is missing', async () => {
    const req = createMockRequest({ collection: 'posts' })
    ;(req.payload.collections as Record<string, unknown>).posts = undefined

    const response = await endpoint.handler(req)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Collection not found' })
  })

  it('returns all editable fields when collection config is true', async () => {
    const response = await endpoint.handler(createMockRequest({ collection: 'posts' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      collection: 'posts',
      fields: [
        { type: 'text', path: 'title' },
        { type: 'text', path: 'slug' },
        { type: 'number', path: 'views' },
      ],
    })
  })

  it('filters to allowed field paths when configured', async () => {
    const response = await endpoint.handler(createMockRequest({ collection: 'pages' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.fields).toEqual([{ type: 'text', path: 'title' }])
  })

  it('excludes configured field paths', async () => {
    const response = await endpoint.handler(createMockRequest({ collection: 'articles' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.fields).toEqual([
      { type: 'text', path: 'title' },
      { type: 'number', path: 'views' },
    ])
  })
})
