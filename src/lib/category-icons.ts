/**
 * Category icon mapping using inline SVG paths.
 * Each category has:
 *  - svg: a compact SVG path string for use in UI pills
 *  - color: a hex color for the map marker background
 *
 * Icons are simple, recognizable silhouettes designed for small display sizes.
 */

export interface CategoryIcon {
  /** SVG path data (d attribute) for a 24x24 viewBox */
  path: string
  /** Hex color for map marker background */
  color: string
  /** Emoji fallback for map marker */
  emoji: string
}

const CATEGORY_ICON_MAP: Record<string, CategoryIcon> = {
  // People/community — group of people
  'Community': {
    path: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    color: '#f59e0b',
    emoji: '🤝',
  },
  'Community Events': {
    path: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    color: '#f59e0b',
    emoji: '🤝',
  },

  // Book — open book
  'Storytimes & Library': {
    path: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
    color: '#8b5cf6',
    emoji: '📚',
  },

  // Graduation cap / lightbulb — learning
  'Learning & Culture': {
    path: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z',
    color: '#06b6d4',
    emoji: '💡',
  },

  // Party popper / celebration
  'Festivals': {
    path: 'M2 22l1-1h4l1 1H2zM5.5 7.5L7 6l8.5 8.5-1.5 1.5L5.5 7.5zm5.3-2.8l1.4-1.4c.4-.4 1-.4 1.4 0l4.6 4.6c.4.4.4 1 0 1.4l-1.4 1.4-6-6zM3 19.5l4-4 2.5 2.5-4 4L3 19.5zm15.5-7L17 14l-7-7 1.5-1.5 7 7zM20.5 6c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM18 3.5c0-.28.22-.5.5-.5s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5zM15.5 5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5z',
    color: '#ec4899',
    emoji: '🎉',
  },
  'Festivals & Celebrations': {
    path: 'M2 22l1-1h4l1 1H2zM5.5 7.5L7 6l8.5 8.5-1.5 1.5L5.5 7.5zm5.3-2.8l1.4-1.4c.4-.4 1-.4 1.4 0l4.6 4.6c.4.4.4 1 0 1.4l-1.4 1.4-6-6zM3 19.5l4-4 2.5 2.5-4 4L3 19.5zm15.5-7L17 14l-7-7 1.5-1.5 7 7zM20.5 6c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM18 3.5c0-.28.22-.5.5-.5s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5zM15.5 5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5z',
    color: '#ec4899',
    emoji: '🎉',
  },

  // Palette — arts & culture
  'Arts & Culture': {
    path: 'M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    color: '#a855f7',
    emoji: '🎨',
  },

  // Indoor/building — home
  'Indoor': {
    path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    color: '#6366f1',
    emoji: '🏠',
  },
  'Indoor Activities': {
    path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    color: '#6366f1',
    emoji: '🏠',
  },

  // Tree / nature — outdoor
  'Outdoor & Nature': {
    path: 'M14 6l-3.75 5h2.75L10 16l-3.75 5h2.75L6 24h12l-3-3h2.75L14 16l-3-5h2.75L14 6zM17 14l1-1.5h-1.5L17 11l-2-3h1.5L14 4l-2.5 4H13l-2 3h1.5L11 12.5h-1.5L11 16h6l-1.5-2z',
    color: '#22c55e',
    emoji: '🌳',
  },

  // Pencil / wrench — classes & workshops
  'Classes & Workshops': {
    path: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    color: '#f97316',
    emoji: '✏️',
  },

  // Paw print — animals
  'Animals & Wildlife': {
    path: 'M4.5 11.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5S7 15.38 7 14s-1.12-2.5-2.5-2.5zm15 0c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5S22 15.38 22 14s-1.12-2.5-2.5-2.5zM8.5 8C7.12 8 6 9.12 6 10.5S7.12 13 8.5 13 11 11.88 11 10.5 9.88 8 8.5 8zm7 0c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5S18 11.88 18 10.5 16.88 8 15.5 8zM12 16c-2.21 0-4 1.34-4 3s1.79 3 4 3 4-1.34 4-3-1.79-3-4-3z',
    color: '#84cc16',
    emoji: '🐾',
  },
}

// Default for unrecognized categories
const DEFAULT_ICON: CategoryIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  color: '#f59e0b',
  emoji: '📍',
}

/**
 * Get the icon config for a category name.
 * Falls back to a generic pin marker for unknown categories.
 */
export function getCategoryIcon(category: string | null | undefined): CategoryIcon {
  if (!category) return DEFAULT_ICON
  // Try exact match first
  if (CATEGORY_ICON_MAP[category]) return CATEGORY_ICON_MAP[category]
  // Try partial match (e.g. "Community" matches "Community Events")
  const lower = category.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return icon
    }
  }
  return DEFAULT_ICON
}

/**
 * Generate an SVG data URL for use as a Leaflet marker icon.
 * Renders a colored pin with the category icon inside.
 */
export function getCategoryMarkerSvg(category: string | null | undefined): string {
  const icon = getCategoryIcon(category)
  // Create a pin-shaped SVG marker with the icon inside
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="${icon.color}" stroke="white" stroke-width="1.5"/>
    <g transform="translate(4, 4) scale(1)" fill="white">
      <path d="${icon.path}"/>
    </g>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * CategoryIconSvg — renders an inline SVG icon for use in React components.
 * Returns the path data and recommended viewBox for a 24x24 icon.
 */
export function getCategoryIconPath(category: string): string {
  return getCategoryIcon(category).path
}
