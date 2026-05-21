import type { FieldValueEntry } from './documentValues.js'

const MIN_SEGMENT_LENGTH = 2

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeTextForMatch(value: string): string {
  return normalizeText(value).normalize('NFC').toLocaleLowerCase()
}

const SKIP_ANCESTOR_SELECTOR =
  'script, style, noscript, svg, [data-payload-visual-editor-ui], .payload-visual-editor-toggle'

export function buildMatchableSegments(entry: FieldValueEntry): string[] {
  const segments = new Set<string>()
  const full = normalizeText(entry.displayValue)

  if (!full) {
    return []
  }

  segments.add(full)

  if (entry.type === 'richText' || entry.type === 'textarea') {
    for (const paragraph of full.split(/\n{2,}|\n/)) {
      const trimmed = normalizeText(paragraph)

      if (trimmed.length >= MIN_SEGMENT_LENGTH) {
        segments.add(trimmed)
      }
    }

    for (const sentence of full.split(/(?<=[.!?])\s+/)) {
      const trimmed = normalizeText(sentence)

      if (trimmed.length >= MIN_SEGMENT_LENGTH) {
        segments.add(trimmed)
      }
    }
  }

  return [...segments]
}

export function buildTextLookup(entries: FieldValueEntry[]) {
  const byText = new Map<string, FieldValueEntry[]>()

  for (const entry of entries) {
    for (const segment of buildMatchableSegments(entry)) {
      const key = normalizeTextForMatch(segment)

      if (!key) {
        continue
      }

      const existing = byText.get(key) ?? []
      existing.push(entry)
      byText.set(key, existing)
    }
  }

  return byText
}

function getOccurrenceIndex(element: HTMLElement, normalizedText: string): number {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
  let index = 0
  let node = walker.nextNode() as HTMLElement | null

  while (node) {
    if (node === element) {
      return index
    }

    if (normalizeTextForMatch(node.innerText) === normalizedText) {
      index += 1
    }

    node = walker.nextNode() as HTMLElement | null
  }

  return 0
}

function pickCandidate(
  element: HTMLElement,
  normalized: string,
  candidates: FieldValueEntry[],
): FieldValueEntry {
  if (candidates.length === 1) {
    return candidates[0]!
  }

  const occurrence = getOccurrenceIndex(element, normalized)
  return candidates[occurrence] ?? candidates[candidates.length - 1]!
}

function resolveLooseFieldForElement(
  element: HTMLElement,
  lookup: Map<string, FieldValueEntry[]>,
  normalized: string,
): FieldValueEntry | null {
  let bestKey: string | null = null

  for (const key of lookup.keys()) {
    if (key.length < MIN_SEGMENT_LENGTH) {
      continue
    }

    if (!normalized.includes(key)) {
      continue
    }

    if (!bestKey || key.length > bestKey.length) {
      bestKey = key
    }
  }

  if (!bestKey) {
    return null
  }

  const candidates = lookup.get(bestKey)

  if (!candidates?.length) {
    return null
  }

  return pickCandidate(element, bestKey, candidates)
}

export function isLeafFieldBlock(
  element: HTMLElement,
  lookup: Map<string, FieldValueEntry[]>,
  field: FieldValueEntry,
): boolean {
  for (const child of element.querySelectorAll('*')) {
    if (!(child instanceof HTMLElement)) {
      continue
    }

    const childField = resolveFieldForElement(child, lookup)

    if (childField && childField.path !== field.path) {
      return false
    }
  }

  return true
}

export function resolveFieldForElement(
  element: HTMLElement,
  lookup: Map<string, FieldValueEntry[]>,
): FieldValueEntry | null {
  if (element.closest(SKIP_ANCESTOR_SELECTOR)) {
    return null
  }

  const normalized = normalizeTextForMatch(element.innerText)

  if (!normalized) {
    return null
  }

  const candidates = lookup.get(normalized)

  if (candidates?.length) {
    return pickCandidate(element, normalized, candidates)
  }

  return resolveLooseFieldForElement(element, lookup, normalized)
}

export function findEditableElementFromTarget(
  target: EventTarget | null,
  lookup: Map<string, FieldValueEntry[]>,
): { element: HTMLElement; field: FieldValueEntry } | null {
  const context = findFieldContextFromTarget(target, lookup)

  if (!context) {
    return null
  }

  return { element: context.blockElement, field: context.field }
}

export function findFieldContextFromTarget(
  target: EventTarget | null,
  lookup: Map<string, FieldValueEntry[]>,
): { blockElement: HTMLElement; field: FieldValueEntry } | null {
  if (!target || !(target instanceof Node)) {
    return null
  }

  let node: Node | null = target

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement
  }

  let element = node instanceof HTMLElement ? node : null
  let bestMatch: { blockElement: HTMLElement; field: FieldValueEntry } | null = null
  let bestLength = Number.POSITIVE_INFINITY

  while (element && element !== document.body) {
    if (element.closest(SKIP_ANCESTOR_SELECTOR)) {
      return null
    }

    const field = resolveFieldForElement(element, lookup)

    if (field && isLeafFieldBlock(element, lookup, field)) {
      const length = normalizeText(element.innerText).length

      if (length < bestLength) {
        bestLength = length
        bestMatch = { blockElement: element, field }
      }
    }

    element = element.parentElement
  }

  return bestMatch
}

const WORD_CHAR_PATTERN = /[\p{L}\p{N}'’-]/u

export function caretRangeFromPoint(x: number, y: number): Range | null {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y)
  }

  const position = document.caretPositionFromPoint?.(x, y)

  if (!position) {
    return null
  }

  const range = document.createRange()
  range.setStart(position.offsetNode, position.offset)
  range.collapse(true)

  return range
}

export function expandRangeToWord(range: Range): Range | null {
  const { startContainer, startOffset } = range

  if (startContainer.nodeType !== Node.TEXT_NODE) {
    return null
  }

  const text = startContainer.textContent ?? ''
  let start = startOffset
  let end = startOffset

  while (start > 0 && WORD_CHAR_PATTERN.test(text[start - 1] ?? '')) {
    start -= 1
  }

  while (end < text.length && WORD_CHAR_PATTERN.test(text[end] ?? '')) {
    end += 1
  }

  if (start === end) {
    return null
  }

  const wordRange = document.createRange()
  wordRange.setStart(startContainer, start)
  wordRange.setEnd(startContainer, end)

  return wordRange
}

export function getWordRangeAtPoint(x: number, y: number): Range | null {
  const caret = caretRangeFromPoint(x, y)

  if (!caret) {
    return null
  }

  return expandRangeToWord(caret)
}

export function wrapRangeWithSpan(range: Range, className: string, attributes?: Record<string, string>) {
  const span = document.createElement('span')
  span.className = className

  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      span.setAttribute(name, value)
    }
  }

  const fragment = range.extractContents()
  span.appendChild(fragment)
  range.insertNode(span)

  return span
}

export function unwrapSpan(span: HTMLElement) {
  const parent = span.parentNode

  if (!parent) {
    return
  }

  while (span.firstChild) {
    parent.insertBefore(span.firstChild, span)
  }

  parent.removeChild(span)
  parent.normalize()
}

export type WordTarget = {
  blockElement: HTMLElement
  field: FieldValueEntry
  wordRange: Range
  wordText: string
}

export function findWordTargetAtPoint(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  lookup: Map<string, FieldValueEntry[]>,
): WordTarget | null {
  const context = findFieldContextFromTarget(target, lookup)

  if (!context) {
    return null
  }

  if (context.field.type === 'number') {
    return null
  }

  const wordRange = getWordRangeAtPoint(clientX, clientY)

  if (!wordRange) {
    return null
  }

  const ancestor = wordRange.commonAncestorContainer

  if (
    ancestor !== context.blockElement &&
    !context.blockElement.contains(ancestor)
  ) {
    return null
  }

  const wordText = normalizeText(wordRange.toString())

  if (!wordText) {
    return null
  }

  return {
    blockElement: context.blockElement,
    field: context.field,
    wordRange,
    wordText,
  }
}
