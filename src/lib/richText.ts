type LexicalNode = {
  text?: string
  type?: string
  children?: LexicalNode[]
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
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

export function coerceVisualEditorValue(
  fieldType: string,
  value: string | number,
  currentValue: unknown,
): unknown {
  if (fieldType === 'number') {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }

  if (fieldType === 'richText') {
    if (typeof value !== 'string') {
      return currentValue
    }

    if (currentValue && typeof currentValue === 'object' && 'root' in (currentValue as object)) {
      return plainTextToLexical(value)
    }

    return value
  }

  return String(value)
}
