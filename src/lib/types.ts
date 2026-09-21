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

export type Profile = {
  id: string
  display_name: string
  avatar_path: string | null
  bio: string | null
}

export type MembershipRow = {
  id: string
  profile_id: string
  role: string
  status: string
  created_at: string
  profile?: Profile
}

export type Invitation = {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

export type ProjectMember = {
  id: string
  project_id: string
  profile_id: string
  role: string
  profile?: Profile
}

export type ProjectDocument = {
  id: string
  project_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  uploaded_by: string
  created_at: string
}

export type Task = {
  id: string
  project_id: string | null
  title: string
  description: string | null
  assignee_id: string | null
  created_by: string
  priority: string
  status: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  assignee?: Profile
  project?: { title: string }
}

export type Meeting = {
  id: string
  title: string
  meeting_type: string
  scheduled_at: string
  duration_minutes: number
  location: string | null
  agenda: string | null
  created_by: string
  project_id: string | null
  created_at: string
}

export type MeetingMinutes = {
  id: string
  meeting_id: string
  body: string | null
  recorded_by: string | null
  status: string
  created_at: string
}

export type Decision = {
  id: string
  meeting_id: string | null
  title: string
  description: string | null
  owner_id: string | null
  deadline: string | null
  status: string
  created_at: string
  owner?: Profile
}

export type Notification = {
  id: string
  recipient_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export type Notice = { tone: 'error' | 'success'; text: string }
