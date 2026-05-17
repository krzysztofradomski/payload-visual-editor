import { describe, expect, it } from 'vitest'

import { buildTextLookup, normalizeText } from './textMatch.js'
import type { FieldValueEntry } from './documentValues.js'

describe('textMatch', () => {
  it('normalizes whitespace', () => {
    expect(normalizeText('  Hello\n  world  ')).toBe('Hello world')
  })

  it('groups duplicate display values for occurrence matching', () => {
    const entries: FieldValueEntry[] = [
      { path: 'title', type: 'text', displayValue: 'Shared title' },
      { path: 'subtitle', type: 'text', displayValue: 'Shared title' },
    ]

    const lookup = buildTextLookup(entries)

    expect(lookup.get('Shared title')).toHaveLength(2)
    expect(lookup.get('Shared title')?.map((entry) => entry.path)).toEqual(['title', 'subtitle'])
  })
})
