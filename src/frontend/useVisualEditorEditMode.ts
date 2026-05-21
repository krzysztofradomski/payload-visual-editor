'use client'

import { useEffect, useState } from 'react'

import { isVisualEditorSetModeMessage } from '../lib/messages.js'
import { useVisualEditorMode } from './useVisualEditorMode.js'

export function useVisualEditorEditMode(): boolean {
  const isLivePreview = useVisualEditorMode()
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (isVisualEditorSetModeMessage(event.data)) {
        setEditMode(event.data.enabled)
      }
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return isLivePreview && editMode
}
