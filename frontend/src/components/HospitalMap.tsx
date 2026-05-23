'use client'

import { useEffect, useRef } from 'react'

export interface Hospital {
  ccn: string
  name: string
  address?: { city?: string; state?: string }
  location?: { coordinates: [number, number] }
  distance_miles?: number | null
  quality?: { cms_star_rating?: number }
  google?: { rating?: number; review_count?: number }
}

interface Props {
  hospitals: Hospital[]
  apiKey?: string
}

function pinColor(stars: number | null | undefined): string {
  if (!stars) return '#94a3b8'
  if (stars >= 4) return '#16A34A'
  if (stars >= 3) return '#d97706'
  return '#DC2626'
}

declare global {
  interface Window {
    _clearPriceMapInit?: () => void
  }
}

export default function HospitalMap({ hospitals, apiKey }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!apiKey || !hospitals.length || !mapRef.current) return

    const validHospitals = hospitals.filter((h) => h.location?.coordinates)
    if (!validHospitals.length) return

    const initMap = () => {
      if (!mapRef.current) return

      const AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement
      const PinElement = google.maps.marker.PinElement

      const center = {
        lat: validHospitals[0].location!.coordinates[1],
        lng: validHospitals[0].location!.coordinates[0],
      }

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 11,
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
      })

      const infoWindow = new google.maps.InfoWindow()


      validHospitals.forEach((h, i) => {
        const [lng, lat] = h.location!.coordinates
        const stars = h.quality?.cms_star_rating

        const pin = new PinElement({
          background: pinColor(stars),
          borderColor: 'white',
          glyphColor: 'white',
          glyph: String(i + 1),
          scale: 1.1,
        })

        const marker = new AdvancedMarkerElement({
          position: { lat, lng },
          map,
          title: h.name,
          content: pin.element,
        })

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family:sans-serif;max-width:220px;padding:4px 0">
              <div style="font-weight:600;font-size:14px;margin-bottom:4px">${h.name}</div>
              ${h.address?.city ? `<div style="color:#64748b;font-size:12px">${h.address.city}, ${h.address.state}</div>` : ''}
              ${stars ? `<div style="color:#d97706;font-size:12px;margin-top:4px">CMS ★ ${stars}/5</div>` : ''}
              ${h.google?.rating ? `<div style="color:#64748b;font-size:12px">Google ★ ${h.google.rating} (${h.google.review_count?.toLocaleString()} reviews)</div>` : ''}
              ${h.distance_miles != null ? `<div style="color:#64748b;font-size:12px">${h.distance_miles} miles away</div>` : ''}
            </div>
          `)
          infoWindow.open({ map, anchor: marker })
        })
      })
    }

    // Load the Maps JS API using the new bootstrap loader
    const existingScript = document.getElementById('gmaps-loader')
    if (existingScript) {
      // Already loaded, just init
      if ((window as typeof window & { google?: typeof google }).google?.maps) {
        initMap()
      } else {
        existingScript.addEventListener('load', initMap)
      }
    } else {
      const script = document.createElement('script')
      script.id = 'gmaps-loader'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=marker`
      script.async = true
      script.defer = true
      script.addEventListener('load', initMap)
      document.head.appendChild(script)
    }
  }, [hospitals, apiKey])

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-100 h-80 flex items-center justify-center text-slate-400 text-sm">
        Map unavailable — GOOGLE_MAPS_API_KEY not set
      </div>
    )
  }

  if (!hospitals.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-100 h-80 flex flex-col items-center justify-center text-slate-400 gap-2">
        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">Search for hospitals to see them on the map</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div ref={mapRef} className="h-96 w-full" />
      <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-4 text-xs text-slate-500">
        <span><span className="text-green-600 font-bold">●</span> 4–5 stars</span>
        <span><span className="text-amber-500 font-bold">●</span> 3 stars</span>
        <span><span className="text-red-600 font-bold">●</span> 1–2 stars</span>
        <span><span className="text-slate-400 font-bold">●</span> No rating</span>
      </div>
    </div>
  )
}
