import type { CollectionConfig } from 'payload'

import { VISUAL_EDITOR_ADMIN_PATH } from '../../src/index.js'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    livePreview: {
      url: ({ data }) => `/posts/${data?.slug}?payloadLivePreview=true`,
    },
    components: {
      edit: {
        beforeDocumentControls: [VISUAL_EDITOR_ADMIN_PATH],
      },
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'excerpt', type: 'textarea' },
    { name: 'views', type: 'number', defaultValue: 0 },
    { name: 'content', type: 'richText' },
  ],
}
