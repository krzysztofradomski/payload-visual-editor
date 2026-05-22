// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { type FieldValueEntry } from '../lib/documentValues.js'
import { buildTextLookup } from '../lib/textMatch.js'
import { stampFieldElements } from './VisualEditorListener.js'

function entry(path: string, displayValue: string, type: FieldValueEntry['type'] = 'text'): FieldValueEntry {
  return { type, displayValue, path }
}

describe('VisualEditorListener stamping', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('prefers a common ancestor so rich text can be selected across nodes', () => {
    const article = document.createElement('article')

    const title = document.createElement('h1')
    title.textContent = 'Post title'

    const content = document.createElement('section')
    content.id = 'content-root'

    const p1 = document.createElement('p')
    p1.textContent = 'First paragraph.'
    const p2 = document.createElement('p')
    p2.textContent = 'Second paragraph.'

    content.append(p1, p2)
    article.append(title, content)
    document.body.append(article)

    const lookup = buildTextLookup([
      entry('title', 'Post title'),
      entry('content', 'First paragraph. Second paragraph.', 'richText'),
    ])

    const stamped = stampFieldElements(article, lookup)

    expect(stamped.get('content')).toBe(content)
    expect(content).toHaveAttribute('data-ve-path', 'content')
    expect(p1).not.toHaveAttribute('data-ve-path')
    expect(p2).not.toHaveAttribute('data-ve-path')
  })
})
