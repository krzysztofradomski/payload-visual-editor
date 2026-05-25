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
    await payload.db.destroy()
  })

  it('collects editable fields from a collection schema', () => {
    const posts = payload.collections.posts.config
    const fields = collectEditableFields(posts.fields, DEFAULT_EDITABLE_FIELD_TYPES)

    expect(fields).toEqual(
      expect.arrayContaining([
        { path: 'title', type: 'text' },
        { path: 'excerpt', type: 'textarea' },
        { path: 'views', type: 'number' },
        { path: 'content', type: 'richText' },
      ]),
    )
  })

  it('registers the visual editor fields endpoint on enabled collections', async () => {
    const endpoint = payload.config.endpoints?.find((item) => item.path === '/visual-editor/fields')

    expect(endpoint).toBeDefined()
    expect(endpoint?.method).toBe('get')
  })
})
