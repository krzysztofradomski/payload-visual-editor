'use client'

import {
  useAllFormFields,
  useConfig,
  useDocumentForm,
  useDocumentInfo,
  useLivePreviewContext,
  useLocale,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { EditableFieldDescriptor } from '../types.js'

import {
  isVisualEditorUpdateMessage,
  VISUAL_EDITOR_SET_MODE_TYPE,
  VISUAL_EDITOR_SYNC_FIELDS_TYPE,
} from '../lib/messages.js'
import { coerceVisualEditorValue } from '../lib/richText.js'

export const VisualEditorAdmin = () => {
  const { config } = useConfig()
  const { dispatchFields, setModified, submit } = useDocumentForm()
  const { id, collectionSlug, globalSlug, setUnpublishedVersionCount } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [formState] = useAllFormFields()
  const {
    appIsReady,
    iframeRef,
    isLivePreviewing,
    popupRef,
    previewWindowType,
    url: previewURL,
  } = useLivePreviewContext()
  const [editMode, setEditMode] = useState(false)

  const allowedPathsRef = useRef<Set<string>>(new Set())
  const fieldTypesRef = useRef<Map<string, string>>(new Map())
  const fieldsRef = useRef<EditableFieldDescriptor[]>([])
  const saveDraftTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null)
  const hasPendingDraftSaveRef = useRef(false)

  const isEnabledCollection = useMemo(() => Boolean(collectionSlug), [collectionSlug])

  const postToPreview = useCallback(
    (message: Record<string, unknown>) => {
      if (!previewURL || !appIsReady) {
        return
      }

      if (previewWindowType === 'popup' && popupRef?.current) {
        popupRef.current.postMessage(message, previewURL)
        return
      }

      iframeRef.current?.contentWindow?.postMessage(message, previewURL)
    },
    [appIsReady, iframeRef, popupRef, previewURL, previewWindowType],
  )

  const syncFieldsToPreview = useCallback(
    (fields: EditableFieldDescriptor[]) => {
      if (!collectionSlug) {
        return
      }

      postToPreview({
        type: VISUAL_EDITOR_SYNC_FIELDS_TYPE,
        collectionSlug,
        fields,
      })
    },
    [collectionSlug, postToPreview],
  )

  const postEditModeToPreview = useCallback(
    (enabled: boolean) => {
      if (!collectionSlug) {
        return
      }

      postToPreview({
        type: VISUAL_EDITOR_SET_MODE_TYPE,
        collectionSlug,
        enabled,
      })

      if (enabled && fieldsRef.current.length > 0) {
        syncFieldsToPreview(fieldsRef.current)
      }
    },
    [collectionSlug, postToPreview, syncFieldsToPreview],
  )

  useEffect(() => {
    if (isLivePreviewing && appIsReady) {
      postEditModeToPreview(editMode)
    }
  }, [appIsReady, editMode, isLivePreviewing, postEditModeToPreview])

  useEffect(() => {
    if (!isEnabledCollection || !collectionSlug) {
      allowedPathsRef.current = new Set()
      fieldTypesRef.current = new Map()
      fieldsRef.current = []
      return
    }

    const loadFields = async () => {
      const response = await fetch(
        `${config.routes.api}/visual-editor/fields?collection=${encodeURIComponent(collectionSlug)}`,
        { credentials: 'include' },
      )

      if (!response.ok) {
        return
      }

      const json = (await response.json()) as { fields: EditableFieldDescriptor[] }
      fieldsRef.current = json.fields
      allowedPathsRef.current = new Set(json.fields.map((field) => field.path))
      fieldTypesRef.current = new Map(json.fields.map((field) => [field.path, field.type]))
      syncFieldsToPreview(json.fields)
    }

    void loadFields()
  }, [collectionSlug, config.routes.api, isEnabledCollection, syncFieldsToPreview])

  const saveDraft = useCallback(async () => {
    const search = `?locale=${locale}&depth=0&fallback-locale=null&draft=true`
    let action: string | undefined
    let method: 'PATCH' | 'POST' = 'POST'

    if (collectionSlug) {
      action = formatAdminURL({
        apiRoute: config.routes.api,
        path: `/${collectionSlug}${id ? `/${id}` : ''}${search}`,
      })

      if (id) {
        method = 'PATCH'
      }
    }

    if (globalSlug) {
      action = formatAdminURL({
        apiRoute: config.routes.api,
        path: `/globals/${globalSlug}${search}`,
      })
    }

    if (!action) {
      return
    }

    await submit({
      action,
      method,
      overrides: {
        _status: 'draft',
      },
      skipValidation: true,
    })

    setUnpublishedVersionCount((count) => count + 1)
  }, [
    collectionSlug,
    config.routes.api,
    globalSlug,
    id,
    locale,
    setUnpublishedVersionCount,
    submit,
  ])

  const flushSaveDraft = useCallback(() => {
    if (!hasPendingDraftSaveRef.current) {
      return
    }

    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current)
      saveDraftTimeoutRef.current = null
    }

    hasPendingDraftSaveRef.current = false
    void saveDraft()
  }, [saveDraft])

  const handleEditToggle = useCallback(() => {
    if (editMode) {
      flushSaveDraft()
      postEditModeToPreview(false)
      setEditMode(false)
      return
    }

    setEditMode(true)
  }, [editMode, flushSaveDraft, postEditModeToPreview])

  useEffect(() => {
    if (!isLivePreviewing) {
      postEditModeToPreview(false)
      flushSaveDraft()
      setEditMode(false)
    }
  }, [flushSaveDraft, isLivePreviewing, postEditModeToPreview])

  useEffect(() => {
    if (!isEnabledCollection) {
      return
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (!isVisualEditorUpdateMessage(event.data)) {
        return
      }

      const { originalSegment, path, saveDraft: shouldSaveDraft = true, value } = event.data

      if (!allowedPathsRef.current.has(path)) {
        return
      }

      const fieldType = fieldTypesRef.current.get(path) ?? 'text'
      const currentValue = formState?.[path]?.value

      const coercedValue = coerceVisualEditorValue(fieldType, value, currentValue, originalSegment)

      dispatchFields({
        type: 'UPDATE',
        path,
        value: coercedValue,
      })
      setModified(true)

      if (!shouldSaveDraft) {
        return
      }

      hasPendingDraftSaveRef.current = true

      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
      }

      saveDraftTimeoutRef.current = setTimeout(() => {
        hasPendingDraftSaveRef.current = false
        saveDraftTimeoutRef.current = null
        void saveDraft()
      }, 400)
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)

      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
      }
    }
  }, [dispatchFields, formState, isEnabledCollection, saveDraft, setModified])

  if (!isEnabledCollection || !isLivePreviewing) {
    return null
  }

  return (
    <>
      <button
        aria-pressed={editMode}
        className="btn btn--icon-style-without-border btn--size-medium btn--style-secondary payload-plugin-visual-editor-toggle"
        data-payload-plugin-visual-editor-ui
        onClick={handleEditToggle}
        title={editMode ? 'Exit visual edit mode' : 'Edit page text in preview'}
        type="button"
      >
        {editMode ? 'Done' : 'Edit'}
      </button>
      {editMode && (
        <span
          className="payload-plugin-visual-editor-hint"
          data-payload-plugin-visual-editor-ui
          style={{ alignSelf: 'center', fontSize: '12px', marginLeft: '0.5rem', opacity: 0.75 }}
        >
          Click text in preview to edit
        </span>
      )}
    </>
  )
}
