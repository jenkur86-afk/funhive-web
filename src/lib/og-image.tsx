import { ImageResponse } from 'next/og'

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }
export const OG_IMAGE_CONTENT_TYPE = 'image/png'

// Shared branded OG image generator (Satori/next-og JSX, not a binary asset) —
// reused by the root and per-route opengraph-image.tsx files so the bee mark
// and gradient only need to be defined once.
export function renderBrandOgImage(tagline: string = 'Discover Family Fun Near You') {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #fbbf24 100%)',
        }}
      >
        <svg width="160" height="160" viewBox="0 0 100 100" fill="none">
          <path d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="3" />
          <ellipse cx="50" cy="55" rx="16" ry="20" fill="#F59E0B" />
          <path d="M34 50h32" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
          <path d="M36 58h28" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="33" r="10" fill="#F59E0B" />
          <circle cx="46" cy="31" r="2.5" fill="#1C1917" />
          <circle cx="54" cy="31" r="2.5" fill="#1C1917" />
        </svg>
        <div
          style={{
            marginTop: 24,
            fontSize: 84,
            fontWeight: 700,
            color: '#ffffff',
            textShadow: '0 2px 8px rgba(146, 64, 14, 0.35)',
          }}
        >
          FunHive
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 32,
            color: '#fde68a',
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE }
  )
}
