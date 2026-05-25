// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it } from 'vitest'

import type { FieldValueEntry } from './documentValues.js'

import {
  buildTextLookup,
  expandRangeToWord,
  findEditableElementFromTarget,
  findFieldContextFromTarget,
  findWordTargetAtPoint,
  isLeafFieldBlock,
  normalizeTextForMatch,
  resolveFieldForElement,
  unwrapSpan,
  wrapRangeWithSpan,
} from './textMatch.js'

function entry(
  path: string,
  displayValue: string,
  type: FieldValueEntry['type'] = 'text',
): FieldValueEntry {
  return { type, displayValue, path }
}

function textEl(tag: string, text: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag)
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value)
  }
  el.textContent = text
  return el
}

function mount(...children: HTMLElement[]): void {
  document.body.replaceChildren(...children)
}

describe('textMatch (DOM)', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  describe('resolveFieldForElement', () => {
    it('resolves exact text matches', () => {
      const title = textEl('h1', 'Hello world', { id: 'title' })
      mount(title)
      const lookup = buildTextLookup([entry('title', 'Hello world')])

      expect(resolveFieldForElement(title, lookup)?.path).toBe('title')
    })

    it('resolves loose substring matches for longer preview text', () => {
      const hero = textEl('p', 'Welcome to our site — Hello world today', { id: 'hero' })
      mount(hero)
      const lookup = buildTextLookup([entry('hero', 'Hello world')])

      expect(resolveFieldForElement(hero, lookup)?.path).toBe('hero')
    })

    it('returns null inside skipped UI ancestors', () => {
      const btn = textEl('span', 'Edit', { id: 'btn' })
      const button = document.createElement('button')
      button.setAttribute('data-payload-plugin-visual-editor-ui', '')
      button.appendChild(btn)
      mount(button)
      const lookup = buildTextLookup([entry('btn', 'Edit')])

      expect(resolveFieldForElement(btn, lookup)).toBeNull()
    })

    it('returns null for empty elements', () => {
      const empty = textEl('div', '', { id: 'empty' })
      mount(empty)
      const lookup = buildTextLookup([entry('title', 'Hello')])

      expect(resolveFieldForElement(empty, lookup)).toBeNull()
    })
  })

  describe('isLeafFieldBlock', () => {
    it('returns false when a child resolves to a different field', () => {
      const child = textEl('span', 'Child', { id: 'child' })
      const wrap = textEl('section', '', { id: 'wrap' })
      wrap.append(document.createTextNode('Parent '), child)
      mount(wrap)
      const lookup = buildTextLookup([entry('wrap', 'Parent Child'), entry('child', 'Child')])

      expect(isLeafFieldBlock(wrap, lookup, entry('wrap', 'Parent Child'))).toBe(false)
    })

    it('returns true when children belong to the same field path', () => {
      const strong = document.createElement('strong')
      strong.textContent = 'Bold'
      const para = textEl('p', '')
      para.id = 'para'
      para.append(strong, document.createTextNode(' text'))
      mount(para)
      const lookup = buildTextLookup([entry('para', 'Bold text')])
      const field = entry('para', 'Bold text')

      expect(isLeafFieldBlock(para, lookup, field)).toBe(true)
    })
  })

  describe('findFieldContextFromTarget', () => {
    it('walks up from a text node to the best leaf block', () => {
      const em = document.createElement('em')
      em.textContent = 'world'
      const para = textEl('p', '')
      para.id = 'para'
      para.append(document.createTextNode('Hello '), em)
      mount(para)
      const lookup = buildTextLookup([entry('para', 'Hello world')])
      const textNode = em.firstChild!

      const context = findFieldContextFromTarget(textNode, lookup)

      expect(context?.field.path).toBe('para')
      expect(context?.blockElement).toBe(para)
    })

    it('returns null for invalid targets', () => {
      const lookup = buildTextLookup([entry('title', 'Hello')])
      expect(findFieldContextFromTarget(null, lookup)).toBeNull()
    })
  })

  describe('findEditableElementFromTarget', () => {
    it('returns element and field from a click target', () => {
      const heading = textEl('h2', 'Page title', { id: 'heading' })
      mount(heading)
      const lookup = buildTextLookup([entry('heading', 'Page title')])

      const match = findEditableElementFromTarget(heading, lookup)

      expect(match?.element).toBe(heading)
      expect(match?.field.path).toBe('heading')
    })
  })

  describe('expandRangeToWord', () => {
    it('expands a caret inside a text node to the surrounding word', () => {
      const p = textEl('p', 'Hello world', { id: 'p' })
      mount(p)
      const textNode = p.firstChild as Text
      const range = document.createRange()
      range.setStart(textNode, 7)
      range.collapse(true)

      expect(expandRangeToWord(range)?.toString()).toBe('world')
    })

    it('returns null when caret is not on a text node', () => {
      const p = textEl('p', 'Hello', { id: 'p' })
      mount(p)
      const range = document.createRange()
      range.selectNode(p)

      expect(expandRangeToWord(range)).toBeNull()
    })
  })

  describe('wrapRangeWithSpan / unwrapSpan', () => {
    it('wraps and unwraps a range without losing text', () => {
      const p = textEl('p', 'Hello world', { id: 'p' })
      mount(p)
      const textNode = p.firstChild as Text
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 5)

      const span = wrapRangeWithSpan(range, 'highlight', { 'data-test': '1' })
      expect(span.textContent).toBe('Hello')
      expect(span).toHaveAttribute('data-test', '1')

      unwrapSpan(span)
      expect(p.textContent).toBe('Hello world')
    })
  })

  describe('findWordTargetAtPoint', () => {
    it('returns null for number fields', () => {
      const count = textEl('p', '42', { id: 'count' })
      mount(count)
      const lookup = buildTextLookup([entry('count', '42', 'number')])

      Object.defineProperty(document, 'caretRangeFromPoint', {
        configurable: true,
        value: () => {
          const range = document.createRange()
          range.setStart(count.firstChild as Text, 1)
          range.collapse(true)
          return range
        },
      })

      expect(findWordTargetAtPoint(count, 0, 0, lookup)).toBeNull()
    })
  })

  describe('duplicate text disambiguation', () => {
    it('maps repeated identical text to entries by DOM order', () => {
      const first = textEl('p', 'Repeat')
      first.className = 'a'
      const second = textEl('p', 'Repeat')
      second.className = 'b'
      mount(first, second)
      const entries = [entry('first', 'Repeat'), entry('second', 'Repeat')]
      const lookup = buildTextLookup(entries)

      const resolvedFirst = resolveFieldForElement(first, lookup)
      const resolvedSecond = resolveFieldForElement(second, lookup)

      expect(resolvedFirst?.path).toBe('first')
      expect(resolvedSecond?.path).toBe('second')
      expect(normalizeTextForMatch(first.innerText)).toBe(normalizeTextForMatch('Repeat'))
    })
  })
})
