export type DevPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  views?: number | null
  content?: unknown
  createdAt?: string
  updatedAt?: string
}
