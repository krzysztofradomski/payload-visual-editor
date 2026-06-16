import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { collectEditableFields } from '../src/lib/collectEditableFields.js'
import { DEFAULT_EDITABLE_FIELD_TYPES } from '../src/types.js'

let payload: Awaited<ReturnType<typeof getPayload>>

describe('payload-plugin-visual-editor', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    if (payload && payload.db && 'destroy' in payload.db) {
      await (payload.db as { destroy: () => Promise<void> }).destroy()
    }
  })

  it('collects editable fields from a collection schema', () => {
    const posts = payload.collections.posts.config
    const fields = collectEditableFields(posts.fields, DEFAULT_EDITABLE_FIELD_TYPES)

    expect(fields).toEqual(
      expect.arrayContaining([
        { type: 'text', path: 'title' },
        { type: 'textarea', path: 'excerpt' },
        { type: 'number', path: 'views' },
        { type: 'richText', path: 'content' },
      ]),
    )
  })

  it('registers the visual editor fields endpoint on enabled collections', () => {
    const endpoint = payload.config.endpoints?.find((item) => item.path === '/visual-editor/fields')

    expect(endpoint).toBeDefined()
    expect(endpoint?.method).toBe('get')
  })
})
