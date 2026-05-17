'use client'

import { ready, subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useEffect, useRef, useState } from 'react'

import { buildFieldValueEntries, type FieldValueEntry } from '../lib/documentValues.js'
import { VISUAL_EDITOR_UPDATE_TYPE } from '../lib/messages.js'
import { buildTextLookup, findEditableElementFromTarget, normalizeText } from '../lib/textMatch.js'
import type { EditableFieldDescriptor } from '../types.js'
import { useVisualEditorMode } from './useVisualEditorMode.js'


const MIN_MATCH_LENGTH = 2

function readValueForField(element: HTMLElement, field: FieldValueEntry): string | number {
  const text = normalizeText(element.innerText)

  if (field.type === 'number') {
    const parsed = Number(text)
    return Number.isNaN(parsed) ? text : parsed
  }

  return text
}

export function VisualEditorListener() {
  const isLivePreview = useVisualEditorMode()
  const [editMode, setEditMode] = useState(false)
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null)

  const documentDataRef = useRef<Record<string, unknown>>({})
  const fieldDescriptorsRef = useRef<EditableFieldDescriptor[]>([])
  const fieldEntriesRef = useRef<FieldValueEntry[]>([])
  const lookupRef = useRef<Map<string, FieldValueEntry[]>>(new Map())
  const activeTargetRef = useRef<HTMLElement | null>(null)
  const activeFieldRef = useRef<FieldValueEntry | null>(null)
  const originalTextRef = useRef<string>('')

  useEffect(() => {
    if (!isLivePreview) {
      return
    }

    if (document.getElementById('payload-visual-editor-styles')) {
      return
    }

    const style = document.createElement('style')
    style.id = 'payload-visual-editor-styles'
    style.textContent = `
.payload-visual-editor-toggle {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2147483646;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  background: #111;
  color: #fff;
  font: 600 13px/1.2 system-ui, -apple-system, sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.payload-visual-editor-toggle[aria-pressed='true'] { background: #0070f3; }
.payload-visual-editor-toggle svg { width: 16px; height: 16px; fill: currentColor; }
.payload-visual-editor-target { outline: 2px dashed #0070f3; outline-offset: 3px; cursor: text; }
.payload-visual-editor-target:focus { outline: 2px solid #0070f3; }
`
    document.head.appendChild(style)
  }, [isLivePreview])

  useEffect(() => {
    if (!isLivePreview) {
      return
    }

    const serverURL = window.location.origin

    ready({ serverURL })

    const onLivePreviewMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'payload-live-preview' || event.data.ready) {
        return
      }

      if (typeof event.data.collectionSlug === 'string') {
        setCollectionSlug(event.data.collectionSlug)
      }
    }

    window.addEventListener('message', onLivePreviewMessage)

    const subscription = subscribe({
      callback: (data) => {
        documentDataRef.current = (data ?? {}) as Record<string, unknown>

        if (fieldDescriptorsRef.current.length > 0) {
          const entries = buildFieldValueEntries(
            documentDataRef.current,
            fieldDescriptorsRef.current,
          )
          fieldEntriesRef.current = entries
          lookupRef.current = buildTextLookup(entries)
        }
      },
      initialData: {},
      serverURL,
    })

    return () => {
      window.removeEventListener('message', onLivePreviewMessage)
      unsubscribe(subscription)
    }
  }, [isLivePreview])

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
      fieldDescriptorsRef.current = json.fields

      const entries = buildFieldValueEntries(documentDataRef.current, json.fields)
      fieldEntriesRef.current = entries
      lookupRef.current = buildTextLookup(entries)
    }

    void loadFields()
  }, [collectionSlug, isLivePreview])

  useEffect(() => {
    if (!isLivePreview || !editMode) {
      activeTargetRef.current?.classList.remove('payload-visual-editor-target')
      activeTargetRef.current = null
      return
    }

    const clearActiveTarget = () => {
      const active = activeTargetRef.current

      if (active && active !== document.activeElement) {
        active.removeAttribute('contenteditable')
        active.classList.remove('payload-visual-editor-target')
      }

      activeTargetRef.current = null
      activeFieldRef.current = null
    }

    const commitChange = (element: HTMLElement, field: FieldValueEntry) => {
      const nextValue = readValueForField(element, field)
      const previous = originalTextRef.current

      if (normalizeText(String(nextValue)) === normalizeText(previous)) {
        return
      }

      const target = window.opener || window.parent

      target?.postMessage(
        {
          path: field.path,
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value: nextValue,
        },
        window.location.origin,
      )
    }

    const onMouseOver = (event: MouseEvent) => {
      if (document.activeElement?.getAttribute('contenteditable') === 'true') {
        return
      }

      const match = findEditableElementFromTarget(event.target, lookupRef.current)

      if (!match || match.field.displayValue.length < MIN_MATCH_LENGTH) {
        return
      }

      if (activeTargetRef.current === match.element) {
        return
      }

      clearActiveTarget()
      activeTargetRef.current = match.element
      activeFieldRef.current = match.field
      match.element.classList.add('payload-visual-editor-target')
    }

    const onMouseOut = (event: MouseEvent) => {
      const active = activeTargetRef.current

      if (!active || active === document.activeElement) {
        return
      }

      const related = event.relatedTarget

      if (related instanceof Node && active.contains(related)) {
        return
      }

      clearActiveTarget()
    }

    const onClick = (event: MouseEvent) => {
      const match = findEditableElementFromTarget(event.target, lookupRef.current)

      if (!match) {
        return
      }

      event.preventDefault()

      const { element, field } = match
      activeTargetRef.current = element
      activeFieldRef.current = field
      originalTextRef.current = normalizeText(element.innerText)

      element.setAttribute('contenteditable', 'true')
      element.classList.add('payload-visual-editor-target')
      element.focus()

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(element)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

    const onBlur = (event: FocusEvent) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      const field = activeFieldRef.current

      if (!field) {
        return
      }

      commitChange(target, field)
      target.removeAttribute('contenteditable')
      target.classList.remove('payload-visual-editor-target')
      activeTargetRef.current = null
      activeFieldRef.current = null
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      const active = activeTargetRef.current

      if (!active) {
        return
      }

      active.innerText = originalTextRef.current
      active.blur()
    }

    document.addEventListener('mouseover', onMouseOver, true)
    document.addEventListener('mouseout', onMouseOut, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('blur', onBlur, true)
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('mouseover', onMouseOver, true)
      document.removeEventListener('mouseout', onMouseOut, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('blur', onBlur, true)
      document.removeEventListener('keydown', onKeyDown, true)
      clearActiveTarget()
    }
  }, [editMode, isLivePreview])

  if (!isLivePreview) {
    return null
  }

  return (
    <button
      type="button"
      className="payload-visual-editor-toggle"
      data-payload-visual-editor-ui
      aria-pressed={editMode}
      title={editMode ? 'Exit visual edit mode' : 'Edit page text'}
      onClick={() => setEditMode((current) => !current)}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
      {editMode ? 'Done' : 'Edit'}
    </button>
  )
}
