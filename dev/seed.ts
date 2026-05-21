import type { Payload } from 'payload'

import { plainTextToLexical } from '../src/lib/richText.js'

import { devUser } from './helpers/credentials.js'

const samplePosts = [
  {
    title: 'Welcome to the visual editor demo',
    slug: 'hello-world',
    excerpt: 'Try live preview and inline editing from the admin panel.',
    views: 128,
    content: plainTextToLexical(
      'This is sample post body content. Open live preview in admin, click Edit, and click this text to change it inline.',
    ),
  },
]

export const seed = async (payload: Payload) => {
  const { totalDocs: userCount } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!userCount) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
  }

  for (const post of samplePosts) {
    const { totalDocs } = await payload.count({
      collection: 'posts',
      where: {
        slug: {
          equals: post.slug,
        },
      },
    })

    if (!totalDocs) {
      await payload.create({
        collection: 'posts',
        data: post,
      })
    }
  }
}
