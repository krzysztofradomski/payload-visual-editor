'use client'

import { subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useVisualEditorEditMode, useVisualEditorMode } from 'payload-plugin-visual-editor/client'
import { useEffect, useRef, useState } from 'react'

import { formatPostMeta, renderRichText } from '../lib/renderPost.js'
import type { DevPost } from '../lib/types.js'

type Props = {
  initialPost: DevPost
  serverURL: string
}

export function PostPreview({ initialPost, serverURL }: Props) {
  const isLivePreview = useVisualEditorMode()
  const isVisualEditing = useVisualEditorEditMode()
  const [post, setPost] = useState(initialPost)
  const pendingRef = useRef<DevPost | null>(null)
  const editingRef = useRef(isVisualEditing)
  editingRef.current = isVisualEditing

  useEffect(() => {
    setPost(initialPost)
  }, [initialPost])

  useEffect(() => {
    if (!isLivePreview) {
      return
    }

    const listener = subscribe<DevPost>({
      callback: (data) => {
        if (editingRef.current) {
          // Don't re-render while user is editing — store for later
          pendingRef.current = data
          return
        }

        setPost(data)
      },
      initialData: initialPost,
      serverURL,
    })

    return () => {
      unsubscribe(listener)
    }
  }, [initialPost, isLivePreview, serverURL])

  // When exiting edit mode, flush pending preview data
  useEffect(() => {
    if (!isVisualEditing && pendingRef.current) {
      setPost(pendingRef.current)
      pendingRef.current = null
    }
  }, [isVisualEditing])

  const content = renderRichText(post.content)

  return (
    <article className="post-article">
      <h1>{post.title}</h1>
      <p className="post-meta">{formatPostMeta(post)}</p>
      {post.excerpt ? <p className="post-excerpt">{post.excerpt}</p> : null}
      <div className="post-content">{content ? <p>{content}</p> : null}</div>
    </article>
  )
}
