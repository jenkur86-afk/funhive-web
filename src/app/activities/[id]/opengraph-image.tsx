import { renderBrandOgImage, renderDetailOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from '@/lib/og-image'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'
export const size = OG_IMAGE_SIZE
export const contentType = OG_IMAGE_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: activity } = await supabase
    .from('activities')
    .select('name, city, state')
    .eq('id', decodeURIComponent(id))
    .single()

  if (!activity) {
    return renderBrandOgImage()
  }

  const subtitle = [activity.city, activity.state].filter(Boolean).join(', ')

  return renderDetailOgImage(activity.name, subtitle || undefined)
}
