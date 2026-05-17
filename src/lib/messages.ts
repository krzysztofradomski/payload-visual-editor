import type { EditableFieldDescriptor } from '../types.js'

export const VISUAL_EDITOR_UPDATE_TYPE = 'payload-visual-editor-update' as const
export const VISUAL_EDITOR_SET_MODE_TYPE = 'payload-visual-editor-set-mode' as const
export const VISUAL_EDITOR_SYNC_FIELDS_TYPE = 'payload-visual-editor-sync-fields' as const

export type VisualEditorUpdatePayload = {
  originalSegment?: string
  path: string
  saveDraft?: boolean
  type: typeof VISUAL_EDITOR_UPDATE_TYPE
  value: string | number
}

export type VisualEditorSetModePayload = {
  collectionSlug?: string
  enabled: boolean
  type: typeof VISUAL_EDITOR_SET_MODE_TYPE
}

export type VisualEditorSyncFieldsPayload = {
  collectionSlug: string
  fields: EditableFieldDescriptor[]
  type: typeof VISUAL_EDITOR_SYNC_FIELDS_TYPE
}

export function isVisualEditorUpdateMessage(
  data: unknown,
): data is VisualEditorUpdatePayload {
  if (!data || typeof data !== 'object') {
    return false
  }

  const message = data as Record<string, unknown>

  return (
    message.type === VISUAL_EDITOR_UPDATE_TYPE &&
    typeof message.path === 'string' &&
    (typeof message.value === 'string' || typeof message.value === 'number')
  )
}

export function isVisualEditorSetModeMessage(
  data: unknown,
): data is VisualEditorSetModePayload {
  if (!data || typeof data !== 'object') {
    return false
  }

  const message = data as Record<string, unknown>

  return message.type === VISUAL_EDITOR_SET_MODE_TYPE && typeof message.enabled === 'boolean'
}

export function isVisualEditorSyncFieldsMessage(
  data: unknown,
): data is VisualEditorSyncFieldsPayload {
  if (!data || typeof data !== 'object') {
    return false
  }

  const message = data as Record<string, unknown>

  return (
    message.type === VISUAL_EDITOR_SYNC_FIELDS_TYPE &&
    typeof message.collectionSlug === 'string' &&
    Array.isArray(message.fields)
  )
}
