'use client'

import { ready, subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useEffect, useRef, useState } from 'react'

import {
  buildFieldValueEntries,
  setValueAtPath,
  type FieldValueEntry,
} from '../lib/documentValues.js'
import {
  isVisualEditorSetModeMessage,
  isVisualEditorSyncFieldsMessage,
  VISUAL_EDITOR_UPDATE_TYPE,
} from '../lib/messages.js'
import {
  buildTextLookup,
  findEditableElementFromTarget,
  normalizeText,
} from '../lib/textMatch.js'
import type { EditableFieldDescriptor } from '../types.js'
import { useVisualEditorMode } from './useVisualEditorMode.js'

const MIN_FIELD_LENGTH = 2
const HOVER_CLASS = 'payload-visual-editor-hover'
const EDITING_CLASS = 'payload-visual-editor-editing'
const FIELD_ATTR = 'data-ve-path'

function injectStyles() {
  if (document.getElementById('payload-visual-editor-styles')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'payload-visual-editor-styles'
  style.textContent = `
[${FIELD_ATTR}] { transition: outline 0.15s ease; }
.${HOVER_CLASS} { outline: 2px dashed rgba(0,112,243,0.5); outline-offset: 3px; cursor: text; border-radius: 2px; }
.${EDITING_CLASS} [${FIELD_ATTR}] { cursor: text; }
.${EDITING_CLASS} [${FIELD_ATTR}]:focus-within,
.${EDITING_CLASS} [${FIELD_ATTR}].ve-active { outline: 2px solid #0070f3; outline-offset: 3px; border-radius: 2px; }
`
  document.head.appendChild(style)
}

/**
 * Walk the container and stamp every element that matches a known field with
 * `data-ve-path`. Returns a map from path → element for quick access.
 */
function stampFieldElements(
  container: HTMLElement,
  lookup: Map<string, FieldValueEntry[]>,
): Map<string, HTMLElement> {
  const stamped = new Map<string, HTMLElement>()

  // Clear previous stamps
  for (const el of container.querySelectorAll(`[${FIELD_ATTR}]`)) {
    el.removeAttribute(FIELD_ATTR)
  }

  // Walk every element inside the container
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT)
  let node = walker.nextNode() as HTMLElement | null

  while (node) {
    const match = findEditableElementFromTarget(node, lookup)

    if (match && !stamped.has(match.field.path)) {
      const text = normalizeText(match.field.displayValue)

      if (text.length >= MIN_FIELD_LENGTH) {
        match.element.setAttribute(FIELD_ATTR, match.field.path)
        stamped.set(match.field.path, match.element)
      }
    }

    node = walker.nextNode() as HTMLElement | null
  }

  return stamped
}

function readFieldText(element: HTMLElement): string {
  return normalizeText(element.innerText)
}

export function VisualEditorListener() {
  const isLivePreview = useVisualEditorMode()
  const [editMode, setEditMode] = useState(false)
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null)

  const documentDataRef = useRef<Record<string, unknown>>({})
  const fieldDescriptorsRef = useRef<EditableFieldDescriptor[]>([])
  const lookupRef = useRef<ReturnType<typeof buildTextLookup>>(new Map())
  // Snapshot of each field's text when edit mode was activated or last synced
  const snapshotsRef = useRef<Map<string, string>>(new Map())
  // Map from field path → stamped DOM element
  const stampedRef = useRef<Map<string, HTMLElement>>(new Map())
  // The editable container element
  const containerRef = useRef<HTMLElement | null>(null)
  // Whether we are currently suppressing live-preview re-renders
  const suppressPreviewRef = useRef(false)
  // Latest preview data received while suppressed
  const latestPreviewRef = useRef<Record<string, unknown> | null>(null)

  function rebuildLookup() {
    const entries = buildFieldValueEntries(documentDataRef.current, fieldDescriptorsRef.current)
    lookupRef.current = buildTextLookup(entries)
  }

  function applyFieldDescriptors(
    fields: EditableFieldDescriptor[],
    documentData: Record<string, unknown>,
  ) {
    fieldDescriptorsRef.current = fields
    documentDataRef.current = documentData
    rebuildLookup()
  }

  // Inject styles once
  useEffect(() => {
    if (isLivePreview) {
      injectStyles()
    }
  }, [isLivePreview])

  // Live preview subscription + admin message handling
  useEffect(() => {
    if (!isLivePreview) {
      return
    }

    const serverURL = window.location.origin

    ready({ serverURL })

    const onAdminMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (isVisualEditorSetModeMessage(event.data)) {
        setEditMode(event.data.enabled)

        if (typeof event.data.collectionSlug === 'string') {
          setCollectionSlug(event.data.collectionSlug)
        }

        return
      }

      if (isVisualEditorSyncFieldsMessage(event.data)) {
        setCollectionSlug(event.data.collectionSlug)
        applyFieldDescriptors(event.data.fields, documentDataRef.current)
        return
      }

      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'payload-live-preview' &&
        typeof event.data.collectionSlug === 'string'
      ) {
        setCollectionSlug(event.data.collectionSlug)
      }
    }

    window.addEventListener('message', onAdminMessage)

    const subscription = subscribe({
      callback: (data) => {
        const docData = (data ?? {}) as Record<string, unknown>

        if (suppressPreviewRef.current) {
          // Store for later but don't update DOM — user is editing
          latestPreviewRef.current = docData
          return
        }

        documentDataRef.current = docData

        if (fieldDescriptorsRef.current.length > 0) {
          rebuildLookup()
        }
      },
      initialData: {},
      serverURL,
    })

    return () => {
      window.removeEventListener('message', onAdminMessage)
      unsubscribe(subscription)
    }
  }, [isLivePreview])

  // Load field descriptors when collection is known
  useEffect(() => {
    if (!isLivePreview || !collectionSlug) {
      return
    }

    const loadFields = async () => {
      const response = await fetch(
        `${window.location.origin}/api/visual-editor/fields?collection=${encodeURIComponent(collectionSlug)}`,
        { credentials: 'include' },
      )

      if (!response.ok) {
        return
      }

      const json = (await response.json()) as { fields: EditableFieldDescriptor[] }
      applyFieldDescriptors(json.fields, documentDataRef.current)
    }

    void loadFields()
  }, [collectionSlug, isLivePreview])

  // ── Edit mode lifecycle ──
  useEffect(() => {
    if (!isLivePreview || !editMode) {
      // Not active — cleanup refs only (the previous effect's cleanup handles commit)
      suppressPreviewRef.current = false
      snapshotsRef.current.clear()
      stampedRef.current.clear()
      containerRef.current = null

      return
    }

    // Entering edit mode — find the main content container
    const container = document.querySelector('main') as HTMLElement | null
      ?? document.querySelector('article') as HTMLElement | null
      ?? document.querySelector('[role="main"]') as HTMLElement | null
      ?? document.body

    containerRef.current = container
    suppressPreviewRef.current = true

    // Stamp fields and snapshot their text
    const stamped = stampFieldElements(container, lookupRef.current)
    stampedRef.current = stamped

    container.classList.add(EDITING_CLASS)

    for (const [path, element] of stamped) {
      snapshotsRef.current.set(path, readFieldText(element))
      element.setAttribute('contenteditable', 'true')
    }

    // ── Hover highlighting ──
    let hoveredField: HTMLElement | null = null

    const onMouseOver = (event: MouseEvent) => {
      const target = event.target
      if (!target || !(target instanceof HTMLElement)) return

      const fieldEl = target.closest(`[${FIELD_ATTR}]`) as HTMLElement | null
      if (fieldEl === hoveredField) return

      if (hoveredField) {
        hoveredField.classList.remove(HOVER_CLASS)
      }

      hoveredField = fieldEl

      if (fieldEl) {
        fieldEl.classList.add(HOVER_CLASS)
      }
    }

    const onMouseOut = (event: MouseEvent) => {
      if (!hoveredField) return

      const related = event.relatedTarget
      if (related instanceof Node && hoveredField.contains(related)) return

      hoveredField.classList.remove(HOVER_CLASS)
      hoveredField = null
    }

    // ── Track active field for outline ──
    let activeFieldEl: HTMLElement | null = null

    const onSelectionChange = () => {
      const sel = document.getSelection()
      if (!sel || sel.rangeCount === 0) return

      const anchor = sel.anchorNode
      if (!anchor) return

      const el = anchor instanceof HTMLElement
        ? anchor.closest(`[${FIELD_ATTR}]`)
        : anchor.parentElement?.closest(`[${FIELD_ATTR}]`)

      const newActive = (el as HTMLElement | null) ?? null

      if (newActive !== activeFieldEl) {
        if (activeFieldEl) {
          activeFieldEl.classList.remove('ve-active')
        }

        activeFieldEl = newActive

        if (activeFieldEl) {
          activeFieldEl.classList.add('ve-active')
        }
      }
    }

    // ── Commit logic ──
    const commitField = (path: string, element: HTMLElement) => {
      const currentText = readFieldText(element)
      const originalText = snapshotsRef.current.get(path)

      if (currentText === originalText) {
        return // No change
      }

      // Update document data
      const fieldDescriptor = fieldDescriptorsRef.current.find((f) => f.path === path)
      const fieldType = fieldDescriptor?.type ?? 'text'
      let value: string | number = currentText

      if (fieldType === 'number') {
        const parsed = Number(currentText)
        value = Number.isNaN(parsed) ? currentText : parsed
      }

      documentDataRef.current = setValueAtPath(documentDataRef.current, path, value)

      // Update snapshot so we don't re-commit
      snapshotsRef.current.set(path, currentText)

      // Post update to admin
      const target = window.opener || window.parent
      target?.postMessage(
        {
          path,
          saveDraft: true,
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value,
        },
        window.location.origin,
      )
    }

    // Debounced commit on input
    let inputTimer: ReturnType<typeof setTimeout> | null = null

    const onInput = () => {
      if (inputTimer) {
        clearTimeout(inputTimer)
      }

      inputTimer = setTimeout(() => {
        inputTimer = null
        commitAllDirtyFields()
      }, 300)
    }

    const commitAllDirtyFields = () => {
      for (const [path, element] of stampedRef.current) {
        if (element.isConnected) {
          commitField(path, element)
        }
      }
    }

    // ── Escape to revert ──
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Revert all fields to snapshot
        for (const [path, element] of stampedRef.current) {
          const original = snapshotsRef.current.get(path)
          if (original != null && element.isConnected) {
            element.innerText = original
            element.blur()
          }
        }
      }
    }

    container.addEventListener('mouseover', onMouseOver, true)
    container.addEventListener('mouseout', onMouseOut, true)
    container.addEventListener('input', onInput, true)
    container.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      container.removeEventListener('mouseover', onMouseOver, true)
      container.removeEventListener('mouseout', onMouseOut, true)
      container.removeEventListener('input', onInput, true)
      container.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('selectionchange', onSelectionChange)

      if (hoveredField) {
        hoveredField.classList.remove(HOVER_CLASS)
      }
      if (activeFieldEl) {
        activeFieldEl.classList.remove('ve-active')
      }
      if (inputTimer) {
        clearTimeout(inputTimer)
      }

      // Commit before unmount
      commitAllDirtyFields()

      for (const element of stampedRef.current.values()) {
        element.removeAttribute('contenteditable')
      }
      container.classList.remove(EDITING_CLASS)
      containerRef.current = null
      suppressPreviewRef.current = false

      // Apply any queued preview data
      if (latestPreviewRef.current) {
        documentDataRef.current = latestPreviewRef.current
        latestPreviewRef.current = null
        rebuildLookup()
      }
    }
  }, [editMode, isLivePreview])

  return null
}
