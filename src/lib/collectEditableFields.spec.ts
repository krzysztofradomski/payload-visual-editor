import { describe, expect, it } from 'vitest'

import { DEFAULT_EDITABLE_FIELD_TYPES } from '../types.js'
import { collectEditableFields } from './collectEditableFields.js'

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
      { type: 'text', path: 'heroTitle' },
      { type: 'textarea', path: 'heroBody' },
      { type: 'number', path: 'meta.count' },
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

    expect(fields).toEqual([{ type: 'text', path: 'sections.heading' }])
  })

  it('respects a custom allowed field type list', () => {
    const fields = collectEditableFields(
      [
        { name: 'title', type: 'text' },
        { name: 'views', type: 'number' },
      ],
      ['text'],
    )

    expect(fields).toEqual([{ type: 'text', path: 'title' }])
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

    expect(fields).toEqual([{ type: 'textarea', path: 'subtitle' }])
  })
})
