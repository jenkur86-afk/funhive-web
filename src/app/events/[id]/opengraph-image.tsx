import { renderBrandOgImage, renderDetailOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from '@/lib/og-image'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'
export const size = OG_IMAGE_SIZE
export const contentType = OG_IMAGE_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('name, event_date, venue, city, state')
    .eq('id', decodeURIComponent(id))
    .eq('reported', false)
    .single()

  if (!event) {
    return renderBrandOgImage()
  }

  const subtitle = [event.event_date, [event.venue, event.city].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')

  return renderDetailOgImage(event.name, subtitle || undefined)
}
