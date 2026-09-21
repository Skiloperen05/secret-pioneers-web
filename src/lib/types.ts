export type SiteSettings = {
  id: string
  site_title: string
  contact_email: string | null
  hero_copy: string | null
  is_published: boolean
}

export type Project = {
  id: string
  title: string
  slug: string
  summary: string | null
  status: string
  cover_image_path: string | null
}

export type StudioProject = Project & {
  visibility: 'internal' | 'private' | 'public'
  is_public: boolean
  published_at: string | null
}

export type Article = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  author_id: string | null
  author_name: string | null
  status: string
  published_at: string | null
  created_at: string
}

export type ServiceOffering = {
  id: string
  title: string
  slug: string
  description: string | null
  status: string
  sort_order: number
  published_at: string | null
}

export type ContactSubmission = {
  id: string
  name: string
  email: string
  message: string
  created_at: string
}

export type Notice = { tone: 'error' | 'success'; text: string }
