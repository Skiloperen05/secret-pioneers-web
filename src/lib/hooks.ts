import { useEffect, useState } from 'react'

import { supabase } from './supabase'

export type Membership = { role: string; status: string }

const editorRoles = ['owner', 'admin', 'editor']

export const canEdit = (membership: Membership | null) =>
  Boolean(
    membership &&
    membership.status === 'active' &&
    editorRoles.includes(membership.role),
  )

export const createSlug = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('nb-NO')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export function useSession() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true
    void client.auth.getSession().then(({ data }) => {
      if (!active) return
      const user = data.session?.user ?? null
      setUserId(user?.id ?? null)
      setEmail(user?.email ?? '')
      setLoading(false)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
      setEmail(session?.user?.email ?? '')
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { userId, email, loading }
}

export function useMembership(userId: string | null) {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    const client = supabase
    if (!client || !userId) return
    let active = true
    void client
      .from('sp_memberships')
      .select('role, status')
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        setMembership(error ? null : data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  return { membership, loading }
}
