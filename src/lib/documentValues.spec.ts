import { describe, expect, it } from 'vitest'

import {
  buildFieldValueEntries,
  getValueAtPath,
  setValueAtPath,
  valueToDisplayString,
} from './documentValues.js'

describe('documentValues', () => {
  it('reads nested paths from preview data', () => {
    const data = {
      title: 'About us',
      layout: [{ body: { content: 'Hello' } }],
    }

    expect(getValueAtPath(data, 'title')).toBe('About us')
    expect(getValueAtPath(data, 'layout.0.body.content')).toBe('Hello')
  })

  it('writes nested paths for optimistic preview updates', () => {
    const updated = setValueAtPath({ title: 'Hello', meta: { label: 'A' } }, 'meta.label', 'B')

    expect(updated).toEqual({ title: 'Hello', meta: { label: 'B' } })
  })

  it('builds display values for editable fields', () => {
    const entries = buildFieldValueEntries(
      { title: 'News', views: 12 },
      [
        { path: 'title', type: 'text' },
        { path: 'views', type: 'number' },
      ],
    )

    expect(entries).toEqual([
      { path: 'title', type: 'text', displayValue: 'News' },
      { path: 'views', type: 'number', displayValue: '12' },
    ])
  })

  it('returns undefined for missing nested paths', () => {
    expect(getValueAtPath({ title: 'Hi' }, 'meta.label')).toBeUndefined()
    expect(getValueAtPath({ meta: null }, 'meta.label')).toBeUndefined()
  })

  it('does not mutate the original document when setting nested paths', () => {
    const original = { meta: { label: 'A' }, title: 'Hello' }
    const updated = setValueAtPath(original, 'meta.label', 'B')

    expect(original.meta).toEqual({ label: 'A' })
    expect(updated).toEqual({ title: 'Hello', meta: { label: 'B' } })
  })

  it('creates intermediate objects for deep paths', () => {
    const updated = setValueAtPath({}, 'meta.label', 'Content')

    expect(updated).toEqual({ meta: { label: 'Content' } })
  })

  describe('valueToDisplayString', () => {
    it('returns null for empty values', () => {
      expect(valueToDisplayString(null, 'text')).toBeNull()
      expect(valueToDisplayString('   ', 'text')).toBeNull()
      expect(valueToDisplayString(undefined, 'number')).toBeNull()
    })

    it('stringifies numbers', () => {
      expect(valueToDisplayString(42, 'number')).toBe('42')
    })

    it('extracts plain text from lexical rich text', () => {
      const lexical = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Hello world' }],
            },
          ],
        },
      }

      expect(valueToDisplayString(lexical, 'richText')).toBe('Hello world')
    })

    it('skips fields with no display value in buildFieldValueEntries', () => {
      const entries = buildFieldValueEntries(
        { title: '', views: null },
        [
          { path: 'title', type: 'text' },
          { path: 'views', type: 'number' },
          { path: 'missing', type: 'text' },
        ],
      )

      expect(entries).toEqual([])
    })
  })
})
