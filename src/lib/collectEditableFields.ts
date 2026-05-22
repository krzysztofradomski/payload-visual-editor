import type { Field } from 'payload'

import type { EditableFieldDescriptor, EditableFieldType } from '../types.js'

import { isEditableFieldType } from '../types.js'

const NESTED_FIELD_TYPES = new Set([
  'array',
  'blocks',
  'collapsible',
  'group',
  'row',
  'tabs',
])

function getFieldsFromContainer(field: Field): Field[] {
  if (field.type === 'tabs') {
    return field.tabs.flatMap((tab) => ('fields' in tab ? tab.fields : []))
  }

  if ('fields' in field && Array.isArray(field.fields)) {
    return field.fields
  }

  return []
}

export function collectEditableFields(
  fields: Field[],
  allowedTypes: readonly EditableFieldType[],
  prefix = '',
): EditableFieldDescriptor[] {
  const result: EditableFieldDescriptor[] = []

  for (const field of fields) {
    if ('name' in field && typeof field.name === 'string') {
      const path = prefix ? `${prefix}.${field.name}` : field.name

      if (isEditableFieldType(field.type, allowedTypes)) {
        result.push({
          type: field.type,
          path,
        })
      }

      if (NESTED_FIELD_TYPES.has(field.type)) {
        result.push(...collectEditableFields(getFieldsFromContainer(field), allowedTypes, path))
      }

      continue
    }

    if (NESTED_FIELD_TYPES.has(field.type)) {
      result.push(...collectEditableFields(getFieldsFromContainer(field), allowedTypes, prefix))
    }
  }

  return result
}
