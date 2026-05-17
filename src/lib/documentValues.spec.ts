import { describe, expect, it } from 'vitest'

import { buildFieldValueEntries, getValueAtPath } from './documentValues.js'

describe('documentValues', () => {
  it('reads nested paths from preview data', () => {
    const data = {
      title: 'About us',
      layout: [{ body: { content: 'Hello' } }],
    }

    expect(getValueAtPath(data, 'title')).toBe('About us')
    expect(getValueAtPath(data, 'layout.0.body.content')).toBe('Hello')
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
})
