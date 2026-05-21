import { describe, expect, it } from 'vitest'

import { collectEditableFields } from './collectEditableFields.js'
import { DEFAULT_EDITABLE_FIELD_TYPES } from '../types.js'

describe('collectEditableFields', () => {
  it('collects nested fields inside groups and tabs', () => {
    const fields = collectEditableFields(
      [
        {
          type: 'tabs',
          tabs: [
            {
              fields: [
                { name: 'heroTitle', type: 'text' },
                { name: 'heroBody', type: 'textarea' },
              ],
              label: 'Hero',
            },
          ],
        },
        {
          name: 'meta',
          type: 'group',
          fields: [{ name: 'count', type: 'number' }],
        },
      ],
      DEFAULT_EDITABLE_FIELD_TYPES,
    )

    expect(fields).toEqual([
      { path: 'heroTitle', type: 'text' },
      { path: 'heroBody', type: 'textarea' },
      { path: 'meta.count', type: 'number' },
    ])
  })

  it('collects fields inside arrays', () => {
    const fields = collectEditableFields(
      [
        {
          name: 'sections',
          type: 'array',
          fields: [{ name: 'heading', type: 'text' }],
        },
      ],
      DEFAULT_EDITABLE_FIELD_TYPES,
    )

    expect(fields).toEqual([{ path: 'sections.heading', type: 'text' }])
  })

  it('respects a custom allowed field type list', () => {
    const fields = collectEditableFields(
      [
        { name: 'title', type: 'text' },
        { name: 'views', type: 'number' },
      ],
      ['text'],
    )

    expect(fields).toEqual([{ path: 'title', type: 'text' }])
  })

  it('collects unnamed nested containers', () => {
    const fields = collectEditableFields(
      [
        {
          type: 'row',
          fields: [{ name: 'subtitle', type: 'textarea' }],
        },
      ],
      DEFAULT_EDITABLE_FIELD_TYPES,
    )

    expect(fields).toEqual([{ path: 'subtitle', type: 'textarea' }])
  })
})
