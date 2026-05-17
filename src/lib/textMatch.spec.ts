import { describe, expect, it } from 'vitest'

import type { FieldValueEntry } from './documentValues.js'
import {
  buildMatchableSegments,
  buildTextLookup,
  normalizeTextForMatch,
} from './textMatch.js'

describe('textMatch', () => {
  it('matches case-insensitively', () => {
    const entries: FieldValueEntry[] = [
      { path: 'title', type: 'text', displayValue: 'Wybrzeże Sztuki powraca' },
    ]

    const lookup = buildTextLookup(entries)

    expect(lookup.has(normalizeTextForMatch('WYBRZEŻE SZTUKI POWRACA'))).toBe(true)
  })

  it('resolves title via loose match when preview text is uppercase', () => {
    const entries: FieldValueEntry[] = [
      { path: 'title', type: 'text', displayValue: 'Wybrzeże Sztuki powraca' },
    ]
    const lookup = buildTextLookup(entries)
    const key = normalizeTextForMatch('WYBRZEŻE SZTUKI POWRACA')

    expect(lookup.has(key)).toBe(true)
  })

  it('creates richText paragraph segments', () => {
    const entry: FieldValueEntry = {
      path: 'richContent',
      type: 'richText',
      displayValue: 'First paragraph. Second sentence.\n\nAnother paragraph.',
    }

    const segments = buildMatchableSegments(entry)

    expect(segments.some((segment) => segment.includes('First paragraph'))).toBe(true)
    expect(segments.some((segment) => segment.includes('Another paragraph'))).toBe(true)
  })
})
