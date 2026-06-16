type LexicalNode = {
  children?: LexicalNode[]
  text?: string
  type?: string
}

export function lexicalToPlainText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const root = (value as { root?: LexicalNode }).root
  if (!root) {
    return ''
  }

  const parts: string[] = []

  const walk = (node: LexicalNode) => {
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
    }

    node.children?.forEach(walk)
  }

  walk(root)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function plainTextToLexical(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          textFormat: 0,
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

export function replaceFirstInsensitive(
  source: string,
  search: string,
  replacement: string,
): string {
  const index = source.toLocaleLowerCase().indexOf(search.toLocaleLowerCase())

  if (index === -1) {
    return replacement
  }

  return `${source.slice(0, index)}${replacement}${source.slice(index + search.length)}`
}

export function coerceVisualEditorValue(
  fieldType: string,
  value: number | string,
  currentValue: unknown,
  originalSegment?: string,
): unknown {
  if (fieldType === 'number') {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }

  if (fieldType === 'text' || fieldType === 'textarea') {
    if (typeof value !== 'string') {
      return value
    }

    const segment = originalSegment?.trim()

    if (segment && typeof currentValue === 'string') {
      return replaceFirstInsensitive(currentValue, segment, value)
    }

    return value
  }

  if (fieldType === 'richText') {
    if (typeof value !== 'string') {
      return currentValue
    }

    if (currentValue && typeof currentValue === 'object' && 'root' in currentValue) {
      const currentPlain = lexicalToPlainText(currentValue)
      const segment = originalSegment?.trim()

      if (segment && currentPlain.toLocaleLowerCase().includes(segment.toLocaleLowerCase())) {
        return plainTextToLexical(replaceFirstInsensitive(currentPlain, segment, value))
      }

      return plainTextToLexical(value)
    }

    return value
  }

  return String(value)
}
