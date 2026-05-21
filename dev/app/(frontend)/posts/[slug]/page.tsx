import config from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

import { PostPreview } from '../../../../components/PostPreview.js'
import type { DevPost } from '../../../../lib/types.js'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function PostPage({ params }: Args) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    limit: 1,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const post = docs[0] as DevPost | undefined

  if (!post) {
    notFound()
  }

  return <PostPreview initialPost={post} serverURL={serverURL} />
}
