import config from '@payload-config'
import { getPayload } from 'payload'

import type { DevPost } from '../../../lib/types.js'

export default async function PostsIndexPage() {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    limit: 50,
    sort: '-createdAt',
  })

  const posts = docs as DevPost[]

  return (
    <>
      <h1>Posts</h1>
      {posts.length === 0 ? (
        <p>No posts yet. Create one in the admin or restart the dev server to run the seed.</p>
      ) : (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <a href={`/posts/${post.slug}`}>
                <h2>{post.title}</h2>
                {post.excerpt ? <p>{post.excerpt}</p> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
