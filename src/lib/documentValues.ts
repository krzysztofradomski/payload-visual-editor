import type { EditableFieldDescriptor } from '../types.js'

import { lexicalToPlainText } from './richText.js'

export type FieldValueEntry = {
  displayValue: string
  path: string
  type: EditableFieldDescriptor['type']
}

export function setValueAtPath(
  data: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = path.split('.')
  const next = { ...data }
  let current: Record<string, unknown> = next

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    const existing = current[segment]

    if (existing == null || typeof existing !== 'object' || Array.isArray(existing)) {
      current[segment] = {}
    } else {
      current[segment] = { ...(existing as Record<string, unknown>) }
    }

    current = current[segment] as Record<string, unknown>
  }

  current[segments[segments.length - 1]] = value

  return next
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
): null | string {
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
      type: field.type,
      displayValue,
      path: field.path,
    })
  }

  return entries
}
