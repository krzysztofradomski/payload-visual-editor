'use client'

import { subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useVisualEditorMode } from 'payload-visual-editor/client'
import { useEffect, useState } from 'react'

import { formatPostMeta, renderRichText } from '../lib/renderPost.js'
import type { DevPost } from '../lib/types.js'

type Props = {
  initialPost: DevPost
  serverURL: string
}

export function PostPreview({ initialPost, serverURL }: Props) {
  const isLivePreview = useVisualEditorMode()
  const [post, setPost] = useState(initialPost)

  useEffect(() => {
    setPost(initialPost)
  }, [initialPost])

  useEffect(() => {
    if (!isLivePreview) {
      return
    }

    const listener = subscribe<DevPost>({
      callback: (data) => {
        setPost(data)
      },
      initialData: initialPost,
      serverURL,
    })

    return () => {
      unsubscribe(listener)
    }
  }, [initialPost, isLivePreview, serverURL])

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
