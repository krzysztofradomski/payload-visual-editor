import { lexicalToPlainText } from './richText.js'
import type { EditableFieldDescriptor } from '../types.js'

export type FieldValueEntry = {
  displayValue: string
  path: string
  type: EditableFieldDescriptor['type']
}

export function getValueAtPath(data: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = data

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

export function valueToDisplayString(
  value: unknown,
  type: EditableFieldDescriptor['type'],
): string | null {
  if (value == null) {
    return null
  }

  if (type === 'number') {
    return String(value)
  }

  if (type === 'richText') {
    const text = lexicalToPlainText(value)
    return text || null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  return null
}

export function buildFieldValueEntries(
  data: Record<string, unknown>,
  fields: EditableFieldDescriptor[],
): FieldValueEntry[] {
  const entries: FieldValueEntry[] = []

  for (const field of fields) {
    const raw = getValueAtPath(data, field.path)
    const displayValue = valueToDisplayString(raw, field.type)

    if (!displayValue) {
      continue
    }

    entries.push({
      displayValue,
      path: field.path,
      type: field.type,
    })
  }

  return entries
}
