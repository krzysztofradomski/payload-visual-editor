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
})
