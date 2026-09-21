import { useCallback, useEffect, useState } from 'react'

import { supabase } from './supabase'
import type { Article, Project, ServiceOffering, SiteSettings } from './types'

let channelId = 0

export function usePublicSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  const load = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_site_settings')
      .select('id, site_title, contact_email, hero_copy, is_published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSettings(data))
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    load()
    const name = `sp-public-settings-${++channelId}`
    const channel = client
      .channel(name)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_site_settings' },
        load,
      )
      .subscribe()
    return () => void client.removeChannel(channel)
  }, [load])

  return { settings }
}

export function usePublicProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(!!supabase)

  const load = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_projects')
      .select('id, title, slug, summary, status, cover_image_path')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    load()
    const name = `sp-public-projects-${++channelId}`
    const channel = client
      .channel(name)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_projects' },
        load,
      )
      .subscribe()
    return () => void client.removeChannel(channel)
  }, [load])

  return { projects, loading }
}

export function usePublicArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(!!supabase)

  const load = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_articles')
      .select(
        'id, title, slug, excerpt, body, author_id, status, published_at, created_at',
      )
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setArticles((data ?? []).map((a) => ({ ...a, author_name: null })))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    load()
    const name = `sp-public-articles-${++channelId}`
    const channel = client
      .channel(name)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_articles' },
        load,
      )
      .subscribe()
    return () => void client.removeChannel(channel)
  }, [load])

  return { articles, loading }
}

export function usePublicServices() {
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [loading, setLoading] = useState(!!supabase)

  const load = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_service_offerings')
      .select('id, title, slug, description, status, sort_order, published_at')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setServices(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    load()
    const name = `sp-public-services-${++channelId}`
    const channel = client
      .channel(name)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_service_offerings' },
        load,
      )
      .subscribe()
    return () => void client.removeChannel(channel)
  }, [load])

  return { services, loading }
}
