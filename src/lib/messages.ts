export const VISUAL_EDITOR_UPDATE_TYPE = 'payload-visual-editor-update' as const

export type VisualEditorUpdatePayload = {
  path: string
  type: typeof VISUAL_EDITOR_UPDATE_TYPE
  value: string | number
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
