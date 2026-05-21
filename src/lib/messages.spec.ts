import { describe, expect, it } from 'vitest'

import {
  isVisualEditorSetModeMessage,
  isVisualEditorSyncFieldsMessage,
  isVisualEditorUpdateMessage,
  VISUAL_EDITOR_SET_MODE_TYPE,
  VISUAL_EDITOR_SYNC_FIELDS_TYPE,
  VISUAL_EDITOR_UPDATE_TYPE,
} from './messages.js'

describe('messages', () => {
  describe('isVisualEditorUpdateMessage', () => {
    it('accepts valid update payloads', () => {
      expect(
        isVisualEditorUpdateMessage({
          path: 'title',
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value: 'Hello',
        }),
      ).toBe(true)

      expect(
        isVisualEditorUpdateMessage({
          path: 'views',
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value: 42,
        }),
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isVisualEditorUpdateMessage(null)).toBe(false)
      expect(isVisualEditorUpdateMessage({ type: VISUAL_EDITOR_UPDATE_TYPE })).toBe(false)
      expect(
        isVisualEditorUpdateMessage({
          path: 'title',
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value: true,
        }),
      ).toBe(false)
      expect(
        isVisualEditorUpdateMessage({
          path: 1,
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value: 'x',
        }),
      ).toBe(false)
    })
  })

  describe('isVisualEditorSetModeMessage', () => {
    it('accepts valid set-mode payloads', () => {
      expect(
        isVisualEditorSetModeMessage({
          enabled: true,
          type: VISUAL_EDITOR_SET_MODE_TYPE,
        }),
      ).toBe(true)

      expect(
        isVisualEditorSetModeMessage({
          collectionSlug: 'posts',
          enabled: false,
          type: VISUAL_EDITOR_SET_MODE_TYPE,
        }),
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isVisualEditorSetModeMessage(undefined)).toBe(false)
      expect(
        isVisualEditorSetModeMessage({
          enabled: 'yes',
          type: VISUAL_EDITOR_SET_MODE_TYPE,
        }),
      ).toBe(false)
    })
  })

  describe('isVisualEditorSyncFieldsMessage', () => {
    it('accepts valid sync-fields payloads', () => {
      expect(
        isVisualEditorSyncFieldsMessage({
          collectionSlug: 'posts',
          fields: [{ path: 'title', type: 'text' }],
          type: VISUAL_EDITOR_SYNC_FIELDS_TYPE,
        }),
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isVisualEditorSyncFieldsMessage({})).toBe(false)
      expect(
        isVisualEditorSyncFieldsMessage({
          collectionSlug: 'posts',
          fields: 'title',
          type: VISUAL_EDITOR_SYNC_FIELDS_TYPE,
        }),
      ).toBe(false)
    })
  })
})
