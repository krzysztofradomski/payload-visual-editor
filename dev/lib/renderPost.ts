import { lexicalToPlainText } from '../../src/lib/richText.js'

import type { DevPost } from './types.js'

export function renderRichText(value: unknown): string {
  const plain = lexicalToPlainText(value)

  if (plain) {
    return plain
  }

  return ''
}

export function formatPostMeta(post: DevPost): string {
  const views = post.views ?? 0
  return `${views} views`
}
