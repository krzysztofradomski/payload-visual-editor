'use client'

import { ready, subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'

import { buildFieldValueEntries, type FieldValueEntry } from '../lib/documentValues.js'
import {
  isVisualEditorSetModeMessage,
  isVisualEditorSyncFieldsMessage,
  VISUAL_EDITOR_UPDATE_TYPE,
} from '../lib/messages.js'
import {
  buildTextLookup,
  findEditableElementFromTarget,
  normalizeText,
  normalizeTextForMatch,
} from '../lib/textMatch.js'
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

function applyFieldDescriptors(
  fields: EditableFieldDescriptor[],
  documentData: Record<string, unknown>,
  fieldDescriptorsRef: MutableRefObject<EditableFieldDescriptor[]>,
  lookupRef: MutableRefObject<ReturnType<typeof buildTextLookup>>,
) {
  fieldDescriptorsRef.current = fields
  const entries = buildFieldValueEntries(documentData, fields)
  lookupRef.current = buildTextLookup(entries)
}

export function VisualEditorListener() {
  const isLivePreview = useVisualEditorMode()
  const [editMode, setEditMode] = useState(false)
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null)

  const documentDataRef = useRef<Record<string, unknown>>({})
  const fieldDescriptorsRef = useRef<EditableFieldDescriptor[]>([])
  const lookupRef = useRef<ReturnType<typeof buildTextLookup>>(new Map())
  const activeTargetRef = useRef<HTMLElement | null>(null)
  const activeFieldRef = useRef<FieldValueEntry | null>(null)
  const originalTextRef = useRef<string>('')
  const commitActiveEditRef = useRef<(() => void) | null>(null)

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

    const onAdminMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (isVisualEditorSetModeMessage(event.data)) {
        if (!event.data.enabled) {
          commitActiveEditRef.current?.()
        }

        setEditMode(event.data.enabled)

        if (typeof event.data.collectionSlug === 'string') {
          setCollectionSlug(event.data.collectionSlug)
        }

        return
      }

      if (isVisualEditorSyncFieldsMessage(event.data)) {
        setCollectionSlug(event.data.collectionSlug)
        applyFieldDescriptors(
          event.data.fields,
          documentDataRef.current,
          fieldDescriptorsRef,
          lookupRef,
        )
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
        documentDataRef.current = (data ?? {}) as Record<string, unknown>

        if (fieldDescriptorsRef.current.length > 0) {
          applyFieldDescriptors(
            fieldDescriptorsRef.current,
            documentDataRef.current,
            fieldDescriptorsRef,
            lookupRef,
          )
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
      applyFieldDescriptors(json.fields, documentDataRef.current, fieldDescriptorsRef, lookupRef)
    }

    void loadFields()
  }, [collectionSlug, isLivePreview])

  useEffect(() => {
    if (!isLivePreview || !editMode) {
      commitActiveEditRef.current = null
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

      if (normalizeTextForMatch(String(nextValue)) === normalizeTextForMatch(previous)) {
        return
      }

      const target = window.opener || window.parent

      target?.postMessage(
        {
          originalSegment: previous,
          path: field.path,
          saveDraft: true,
          type: VISUAL_EDITOR_UPDATE_TYPE,
          value: nextValue,
        },
        window.location.origin,
      )
    }

    const commitActiveEdit = () => {
      const active = activeTargetRef.current
      const field = activeFieldRef.current

      if (!active || !field) {
        return
      }

      commitChange(active, field)
      active.removeAttribute('contenteditable')
      active.classList.remove('payload-visual-editor-target')
      activeTargetRef.current = null
      activeFieldRef.current = null
    }

    commitActiveEditRef.current = commitActiveEdit

    const onMouseOver = (event: MouseEvent) => {
      if (document.activeElement?.getAttribute('contenteditable') === 'true') {
        return
      }

      const match = findEditableElementFromTarget(event.target, lookupRef.current)

      if (!match || normalizeText(match.field.displayValue).length < MIN_MATCH_LENGTH) {
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
      commitActiveEditRef.current = null
      document.removeEventListener('mouseover', onMouseOver, true)
      document.removeEventListener('mouseout', onMouseOut, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('blur', onBlur, true)
      document.removeEventListener('keydown', onKeyDown, true)
      commitActiveEdit()
    }
  }, [editMode, isLivePreview])

  return null
}
