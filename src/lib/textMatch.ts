import type { FieldValueEntry } from './documentValues.js'

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

const SKIP_ANCESTOR_SELECTOR =
  'script, style, noscript, svg, [data-payload-visual-editor-ui], .payload-visual-editor-toggle'

export function buildTextLookup(entries: FieldValueEntry[]) {
  const byText = new Map<string, FieldValueEntry[]>()

  for (const entry of entries) {
    const key = normalizeText(entry.displayValue)

    if (!key) {
      continue
    }

    const existing = byText.get(key) ?? []
    existing.push(entry)
    byText.set(key, existing)
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

    if (normalizeText(node.innerText) === normalizedText) {
      index += 1
    }

    node = walker.nextNode() as HTMLElement | null
  }

  return 0
}

export function resolveFieldForElement(
  element: HTMLElement,
  lookup: Map<string, FieldValueEntry[]>,
): FieldValueEntry | null {
  if (element.closest(SKIP_ANCESTOR_SELECTOR)) {
    return null
  }

  const normalized = normalizeText(element.innerText)

  if (!normalized) {
    return null
  }

  const candidates = lookup.get(normalized)

  if (!candidates?.length) {
    return null
  }

  if (candidates.length === 1) {
    return candidates[0]!
  }

  const occurrence = getOccurrenceIndex(element, normalized)
  return candidates[occurrence] ?? candidates[candidates.length - 1]!
}

export function findEditableElementFromTarget(
  target: EventTarget | null,
  lookup: Map<string, FieldValueEntry[]>,
): { element: HTMLElement; field: FieldValueEntry } | null {
  if (!target || !(target instanceof Node)) {
    return null
  }

  let node: Node | null = target

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement
  }

  let element = node instanceof HTMLElement ? node : null

  while (element && element !== document.body) {
    if (element.closest(SKIP_ANCESTOR_SELECTOR)) {
      return null
    }

    const field = resolveFieldForElement(element, lookup)

    if (field) {
      return { element, field }
    }

    element = element.parentElement
  }

  return null
}
