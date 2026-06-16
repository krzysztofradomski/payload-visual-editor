import { redirect } from 'next/navigation.js'

export default function HomePage() {
  redirect('/posts')
}
