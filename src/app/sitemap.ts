import type { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase-server'

const BASE_URL = 'https://myfunhive.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()

  // Fetch recent events and activities (cap at 500 each to limit egress)
  const [{ data: events }, { data: activities }] = await Promise.all([
    supabase
      .from('events')
      .select('id, updated_at')
      .eq('reported', false)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(500),
    supabase
      .from('activities')
      .select('id, updated_at')
      .eq('reported', false)
      .order('id', { ascending: true })
      .limit(500),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/events`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/activities`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const eventRoutes: MetadataRoute.Sitemap = (events || []).map((e) => ({
    url: `${BASE_URL}/events/${e.id}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const activityRoutes: MetadataRoute.Sitemap = (activities || []).map((a) => ({
    url: `${BASE_URL}/activities/${a.id}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...eventRoutes, ...activityRoutes]
}
