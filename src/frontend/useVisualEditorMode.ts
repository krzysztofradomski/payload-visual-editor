'use client'

import { useSyncExternalStore } from 'react'

const VISUAL_EDITOR_PARAM = 'payloadLivePreview'

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('popstate', callback)

  return () => {
    window.removeEventListener('popstate', callback)
  }
}

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get(VISUAL_EDITOR_PARAM) === 'true'
}

function getServerSnapshot() {
  return false
}

export function useVisualEditorMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
