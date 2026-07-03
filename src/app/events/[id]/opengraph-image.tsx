import { renderBrandOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'edge'
export const size = OG_IMAGE_SIZE
export const contentType = OG_IMAGE_CONTENT_TYPE

export default function Image() {
  return renderBrandOgImage()
}
