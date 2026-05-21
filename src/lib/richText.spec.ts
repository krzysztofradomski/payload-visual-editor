import { describe, expect, it } from 'vitest'

import {
  coerceVisualEditorValue,
  lexicalToPlainText,
  plainTextToLexical,
  replaceFirstInsensitive,
} from './richText.js'

describe('richText', () => {
  it('replaces a word inside textarea fields using originalSegment', () => {
    const result = coerceVisualEditorValue(
      'textarea',
      'visual',
      'Try live preview and inline editing from the admin panel.',
      'preview',
    )

    expect(result).toBe('Try live visual and inline editing from the admin panel.')
    expect(result).toBe(
      replaceFirstInsensitive(
        'Try live preview and inline editing from the admin panel.',
        'preview',
        'visual',
      ),
    )
  })

  it('replaces a word inside text fields using originalSegment', () => {
    const result = coerceVisualEditorValue('text', 'world', 'Hello preview world', 'preview')

    expect(result).toBe('Hello world world')
  })

  it('returns replacement unchanged when search is not found', () => {
    expect(replaceFirstInsensitive('Hello world', 'missing', 'x')).toBe('x')
  })

  it('performs case-insensitive replacement', () => {
    expect(replaceFirstInsensitive('Hello PREVIEW', 'preview', 'world')).toBe('Hello world')
  })

  describe('lexicalToPlainText', () => {
    it('returns empty string for invalid input', () => {
      expect(lexicalToPlainText(null)).toBe('')
      expect(lexicalToPlainText('text')).toBe('')
      expect(lexicalToPlainText({})).toBe('')
    })

    it('joins text nodes with spaces', () => {
      const lexical = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: 'Hello' },
                { type: 'text', text: 'world' },
              ],
            },
          ],
        },
      }

      expect(lexicalToPlainText(lexical)).toBe('Hello world')
    })
  })

  describe('plainTextToLexical', () => {
    it('wraps text in a minimal lexical document', () => {
      const doc = plainTextToLexical('Hello')
      expect(lexicalToPlainText(doc)).toBe('Hello')
    })
  })

  describe('coerceVisualEditorValue', () => {
    it('parses number fields', () => {
      expect(coerceVisualEditorValue('number', '42', 0)).toBe(42)
      expect(coerceVisualEditorValue('number', 'not-a-number', 0)).toBe('not-a-number')
      expect(coerceVisualEditorValue('number', 7, 0)).toBe(7)
    })

    it('returns full value when text has no original segment', () => {
      expect(coerceVisualEditorValue('text', 'New title', 'Old title')).toBe('New title')
    })

    it('replaces a segment inside rich text', () => {
      const current = plainTextToLexical('Hello preview world')
      const result = coerceVisualEditorValue('richText', 'universe', current, 'preview')

      expect(lexicalToPlainText(result)).toBe('Hello universe world')
    })

    it('replaces entire rich text when segment is not found', () => {
      const current = plainTextToLexical('Hello world')
      const result = coerceVisualEditorValue('richText', 'Replaced', current, 'missing')

      expect(lexicalToPlainText(result)).toBe('Replaced')
    })

    it('returns current value for non-string rich text updates', () => {
      const current = plainTextToLexical('Hello')
      expect(coerceVisualEditorValue('richText', 42, current)).toBe(current)
    })

    it('falls back to string for unknown field types', () => {
      expect(coerceVisualEditorValue('unknown', 99, null)).toBe('99')
    })
  })
})
