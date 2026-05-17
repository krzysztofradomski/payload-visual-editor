'use client'

import {
  useAllFormFields,
  useConfig,
  useDocumentForm,
  useDocumentInfo,
} from '@payloadcms/ui'
import { useEffect, useMemo, useRef } from 'react'

import { isVisualEditorUpdateMessage } from '../lib/messages.js'
import { coerceVisualEditorValue } from '../lib/richText.js'
import type { EditableFieldDescriptor } from '../types.js'

export const VisualEditorBridge = () => {
  const { config } = useConfig()
  const { dispatchFields, setModified } = useDocumentForm()
  const { collectionSlug } = useDocumentInfo()
  const [formState] = useAllFormFields()

  const allowedPathsRef = useRef<Set<string>>(new Set())
  const fieldTypesRef = useRef<Map<string, string>>(new Map())

  const isEnabledCollection = useMemo(() => Boolean(collectionSlug), [collectionSlug])

  useEffect(() => {
    if (!isEnabledCollection || !collectionSlug) {
      allowedPathsRef.current = new Set()
      fieldTypesRef.current = new Map()
      return
    }

    const loadFields = async () => {
      const response = await fetch(
        `${config.routes.api}/visual-editor/fields?collection=${encodeURIComponent(collectionSlug)}`,
        {
          credentials: 'include',
        },
      )

      if (!response.ok) {
        return
      }

      const json = (await response.json()) as { fields: EditableFieldDescriptor[] }
      allowedPathsRef.current = new Set(json.fields.map((field) => field.path))
      fieldTypesRef.current = new Map(json.fields.map((field) => [field.path, field.type]))
    }

    void loadFields()
  }, [collectionSlug, config.routes.api, isEnabledCollection])

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

      const { path, value } = event.data

      if (!allowedPathsRef.current.has(path)) {
        return
      }

      const fieldType = fieldTypesRef.current.get(path) ?? 'text'
      const currentValue = formState?.[path]?.value
      const coercedValue = coerceVisualEditorValue(fieldType, value, currentValue)

      dispatchFields({
        path,
        type: 'UPDATE',
        value: coercedValue,
      })
      setModified(true)
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [dispatchFields, formState, isEnabledCollection, setModified])

  return null
}
