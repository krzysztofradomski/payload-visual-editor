import { describe, expect, it } from 'vitest'

import { coerceVisualEditorValue, replaceFirstInsensitive } from './richText.js'

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
})
