import type { CollectionSlug, Field, FieldTypes } from 'payload'

export const DEFAULT_EDITABLE_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'richText',
] as const satisfies readonly FieldTypes[]

export type EditableFieldType = (typeof DEFAULT_EDITABLE_FIELD_TYPES)[number]

export type VisualEditorCollectionConfig =
  | {
      /** Field paths excluded from visual editing (e.g. slug). */
      excludeFields?: string[]
      /** Only these field paths are editable in live preview. */
      fields?: string[]
    }
  | true

export type PayloadVisualEditorConfig = {
  /**
   * Collections that support inline visual editing in live preview.
   */
  collections?: Record<string, VisualEditorCollectionConfig>
  disabled?: boolean
  /**
   * Field types that can be edited visually. Defaults to text, textarea, number, and richText.
   */
  editableFieldTypes?: EditableFieldType[]
}

export type EditableFieldDescriptor = {
  path: string
  type: EditableFieldType
}

export type VisualEditorUpdateMessage = {
  path: string
  type: 'payload-visual-editor-update'
  value: number | string
}

export type VisualEditorFieldsResponse = {
  collection: string
  fields: EditableFieldDescriptor[]
}

export function isEditableFieldType(
  type: Field['type'],
  allowed: readonly EditableFieldType[],
): type is EditableFieldType {
  return (allowed as readonly string[]).includes(type)
}
