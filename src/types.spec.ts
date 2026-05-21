import { describe, expect, it } from 'vitest'

import { DEFAULT_EDITABLE_FIELD_TYPES, isEditableFieldType } from './types.js'

describe('types', () => {
  describe('isEditableFieldType', () => {
    it('returns true for default editable types', () => {
      for (const type of DEFAULT_EDITABLE_FIELD_TYPES) {
        expect(isEditableFieldType(type, DEFAULT_EDITABLE_FIELD_TYPES)).toBe(true)
      }
    })

    it('returns false for non-editable types', () => {
      expect(isEditableFieldType('email', DEFAULT_EDITABLE_FIELD_TYPES)).toBe(false)
      expect(isEditableFieldType('upload', DEFAULT_EDITABLE_FIELD_TYPES)).toBe(false)
    })

    it('respects a custom allowed list', () => {
      const allowed = ['text', 'number'] as const
      expect(isEditableFieldType('text', allowed)).toBe(true)
      expect(isEditableFieldType('richText', allowed)).toBe(false)
    })
  })
})
