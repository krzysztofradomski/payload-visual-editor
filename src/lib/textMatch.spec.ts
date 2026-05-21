import { describe, expect, it } from 'vitest'

import type { FieldValueEntry } from './documentValues.js'
import {
  buildMatchableSegments,
  buildTextLookup,
  normalizeText,
  normalizeTextForMatch,
} from './textMatch.js'

describe('textMatch', () => {
  describe('normalizeText', () => {
    it('collapses whitespace and trims', () => {
      expect(normalizeText('  Hello   world \n\n  ')).toBe('Hello world')
    })
  })

  describe('normalizeTextForMatch', () => {
    it('matches case-insensitively and normalizes unicode', () => {
      expect(normalizeTextForMatch('  HELLO  ')).toBe(normalizeTextForMatch('hello'))
    })
  })

  describe('buildMatchableSegments', () => {
    it('returns empty array for blank display values', () => {
      expect(buildMatchableSegments({ path: 'x', type: 'text', displayValue: '   ' })).toEqual([])
    })

    it('adds only the full string for plain text fields', () => {
      const segments = buildMatchableSegments({
        path: 'title',
        type: 'text',
        displayValue: 'First. Second.',
      })

      expect(segments).toEqual(['First. Second.'])
    })

    it('creates richText paragraph and sentence segments', () => {
      const entry: FieldValueEntry = {
        path: 'richContent',
        type: 'richText',
        displayValue: 'First paragraph. Second sentence.\n\nAnother paragraph.',
      }

      const segments = buildMatchableSegments(entry)

      expect(segments.some((segment) => segment.includes('First paragraph'))).toBe(true)
      expect(segments.some((segment) => segment.includes('Another paragraph'))).toBe(true)
      expect(segments.some((segment) => segment.includes('Second sentence.'))).toBe(true)
    })

    it('creates textarea sentence segments after whitespace normalization', () => {
      const segments = buildMatchableSegments({
        path: 'body',
        type: 'textarea',
        displayValue: 'First line. Second line.',
      })

      expect(segments).toContain('First line.')
      expect(segments).toContain('Second line.')
    })

    it('skips segments shorter than two characters', () => {
      const segments = buildMatchableSegments({
        path: 'x',
        type: 'richText',
        displayValue: 'A\n\nB',
      })

      expect(segments).not.toContain('A')
      expect(segments).not.toContain('B')
    })
  })

  describe('buildTextLookup', () => {
    it('indexes entries by normalized segment text', () => {
      const entries: FieldValueEntry[] = [
        { path: 'title', type: 'text', displayValue: 'Wybrzeże Sztuki powraca' },
      ]

      const lookup = buildTextLookup(entries)

      expect(lookup.has(normalizeTextForMatch('WYBRZEŻE SZTUKI POWRACA'))).toBe(true)
      expect(lookup.get(normalizeTextForMatch('Wybrzeże Sztuki powraca'))).toEqual(entries)
    })

    it('stores multiple entries under the same segment key', () => {
      const entries: FieldValueEntry[] = [
        { path: 'a', type: 'text', displayValue: 'Hello' },
        { path: 'b', type: 'text', displayValue: 'Hello' },
      ]

      const lookup = buildTextLookup(entries)
      const matches = lookup.get(normalizeTextForMatch('hello'))

      expect(matches).toHaveLength(2)
    })
  })
})
