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
  if (!target || !(target instanceof Node)) {
    return null
  }

  let node: Node | null = target

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement
  }

  let element = node instanceof HTMLElement ? node : null
  let bestMatch: { element: HTMLElement; field: FieldValueEntry } | null = null
  let bestLength = Number.POSITIVE_INFINITY

  while (element && element !== document.body) {
    if (element.closest(SKIP_ANCESTOR_SELECTOR)) {
      return null
    }

    const field = resolveFieldForElement(element, lookup)

    if (field) {
      const length = normalizeText(element.innerText).length

      if (length < bestLength) {
        bestLength = length
        bestMatch = { element, field }
      }
    }

    element = element.parentElement
  }

  return bestMatch
}
