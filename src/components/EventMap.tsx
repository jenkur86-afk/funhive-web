'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getCategoryIcon } from '@/lib/category-icons'

// Cache generated marker icons by category to avoid re-creating SVG data URLs
const markerIconCache = new Map<string, L.Icon>()

function getCategoryMarkerIcon(category: string | null | undefined): L.Icon {
  const key = category || '__default__'
  if (markerIconCache.has(key)) return markerIconCache.get(key)!

  const icon = getCategoryIcon(category)

  // Build a pin-shaped SVG with the category icon inside
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M16 1C8.27 1 2 7.27 2 15c0 10.5 14 25 14 25s14-14.5 14-25C30 7.27 23.73 1 16 1z" fill="${icon.color}" stroke="white" stroke-width="2" filter="url(#s)"/>
    <circle cx="16" cy="14" r="9" fill="white" opacity="0.25"/>
    <g transform="translate(4, 2) scale(1)" fill="white">
      <path d="${icon.path}"/>
    </g>
  </svg>`

  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`

  const leafletIcon = L.icon({
    iconUrl: dataUrl,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  })

  markerIconCache.set(key, leafletIcon)
  return leafletIcon
}

// Default fallback icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

interface EventMapProps {
  events: any[]
  center: { lat: number; lng: number }
}

function extractCoords(event: any): { lat: number; lng: number } | null {
  // Supabase PostGIS → GeoJSON: {type:"Point", coordinates:[lng,lat]}
  if (event.location && typeof event.location === 'object') {
    const coords = event.location.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lng: coords[0], lat: coords[1] }
    }
  }
  // RPC functions may return flat lat/lng
  const lat = event.lat || event.latitude
  const lng = event.lng || event.longitude
  if (lat && lng) return { lat, lng }
  return null
}

export default function EventMap({ events, center }: EventMapProps) {
  // Only include events that have valid coordinates
  const mappableEvents = useMemo(
    () => events.filter((e) => extractCoords(e) !== null),
    [events]
  )

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {mappableEvents.map((event) => {
        const pos = extractCoords(event)!
        const markerIcon = getCategoryMarkerIcon(event.category)

        return (
          <Marker key={event.id} position={[pos.lat, pos.lng]} icon={markerIcon}>
            <Popup>
              <div className="min-w-44">
                <div className="flex items-center gap-1.5 mb-1">
                  {event.category && (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryIcon(event.category).color }}
                    />
                  )}
                  <strong className="text-sm leading-tight">{event.name}</strong>
                </div>
                {event.event_date && (
                  <p className="text-xs text-gray-600 mb-0.5">{event.event_date}</p>
                )}
                {event.start_time && (
                  <p className="text-xs text-amber-600 mb-0.5">
                    {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                  </p>
                )}
                {event.venue && (
                  <p className="text-xs text-gray-500 mb-1">{event.venue}</p>
                )}
                {event.category && (
                  <p className="text-xs text-gray-400 mb-1">{event.category}</p>
                )}
                <a
                  href={`/events/${encodeURIComponent(event.id)}`}
                  className="text-amber-600 text-xs font-medium hover:underline"
                >
                  View Details →
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
