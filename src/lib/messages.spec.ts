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
          type: VISUAL_EDITOR_UPDATE_TYPE,
          path: 'title',
          value: 'Hello',
        }),
      ).toBe(true)

      expect(
        isVisualEditorUpdateMessage({
          type: VISUAL_EDITOR_UPDATE_TYPE,
          path: 'views',
          value: 42,
        }),
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isVisualEditorUpdateMessage(null)).toBe(false)
      expect(isVisualEditorUpdateMessage({ type: VISUAL_EDITOR_UPDATE_TYPE })).toBe(false)
      expect(
        isVisualEditorUpdateMessage({
          type: VISUAL_EDITOR_UPDATE_TYPE,
          path: 'title',
          value: true,
        }),
      ).toBe(false)
      expect(
        isVisualEditorUpdateMessage({
          type: VISUAL_EDITOR_UPDATE_TYPE,
          path: 1,
          value: 'x',
        }),
      ).toBe(false)
    })
  })

  describe('isVisualEditorSetModeMessage', () => {
    it('accepts valid set-mode payloads', () => {
      expect(
        isVisualEditorSetModeMessage({
          type: VISUAL_EDITOR_SET_MODE_TYPE,
          enabled: true,
        }),
      ).toBe(true)

      expect(
        isVisualEditorSetModeMessage({
          type: VISUAL_EDITOR_SET_MODE_TYPE,
          collectionSlug: 'posts',
          enabled: false,
        }),
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isVisualEditorSetModeMessage(undefined)).toBe(false)
      expect(
        isVisualEditorSetModeMessage({
          type: VISUAL_EDITOR_SET_MODE_TYPE,
          enabled: 'yes',
        }),
      ).toBe(false)
    })
  })

  describe('isVisualEditorSyncFieldsMessage', () => {
    it('accepts valid sync-fields payloads', () => {
      expect(
        isVisualEditorSyncFieldsMessage({
          type: VISUAL_EDITOR_SYNC_FIELDS_TYPE,
          collectionSlug: 'posts',
          fields: [{ type: 'text', path: 'title' }],
        }),
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isVisualEditorSyncFieldsMessage({})).toBe(false)
      expect(
        isVisualEditorSyncFieldsMessage({
          type: VISUAL_EDITOR_SYNC_FIELDS_TYPE,
          collectionSlug: 'posts',
          fields: 'title',
        }),
      ).toBe(false)
    })
  })
})
