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
      expect(buildMatchableSegments({ type: 'text', displayValue: '   ', path: 'x' })).toEqual([])
    })

    it('adds only the full string for plain text fields', () => {
      const segments = buildMatchableSegments({
        type: 'text',
        displayValue: 'First. Second.',
        path: 'title',
      })

      expect(segments).toEqual(['First. Second.'])
    })

    it('creates richText paragraph and sentence segments', () => {
      const entry: FieldValueEntry = {
        type: 'richText',
        displayValue: 'First paragraph. Second sentence.\n\nAnother paragraph.',
        path: 'richContent',
      }

      const segments = buildMatchableSegments(entry)

      expect(segments.some((segment) => segment.includes('First paragraph'))).toBe(true)
      expect(segments.some((segment) => segment.includes('Another paragraph'))).toBe(true)
      expect(segments.some((segment) => segment.includes('Second sentence.'))).toBe(true)
    })

    it('creates textarea sentence segments after whitespace normalization', () => {
      const segments = buildMatchableSegments({
        type: 'textarea',
        displayValue: 'First line. Second line.',
        path: 'body',
      })

      expect(segments).toContain('First line.')
      expect(segments).toContain('Second line.')
    })

    it('skips segments shorter than two characters', () => {
      const segments = buildMatchableSegments({
        type: 'richText',
        displayValue: 'A\n\nB',
        path: 'x',
      })

      expect(segments).not.toContain('A')
      expect(segments).not.toContain('B')
    })
  })

  describe('buildTextLookup', () => {
    it('indexes entries by normalized segment text', () => {
      const entries: FieldValueEntry[] = [
        { type: 'text', displayValue: 'Wybrzeże Sztuki powraca', path: 'title' },
      ]

      const lookup = buildTextLookup(entries)

      expect(lookup.has(normalizeTextForMatch('WYBRZEŻE SZTUKI POWRACA'))).toBe(true)
      expect(lookup.get(normalizeTextForMatch('Wybrzeże Sztuki powraca'))).toEqual(entries)
    })

    it('stores multiple entries under the same segment key', () => {
      const entries: FieldValueEntry[] = [
        { type: 'text', displayValue: 'Hello', path: 'a' },
        { type: 'text', displayValue: 'Hello', path: 'b' },
      ]

      const lookup = buildTextLookup(entries)
      const matches = lookup.get(normalizeTextForMatch('hello'))

      expect(matches).toHaveLength(2)
    })
  })
})
