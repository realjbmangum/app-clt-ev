import { useState, useEffect, useRef, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useStations } from '../lib/hooks'

const STATUS_COLORS = {
  AVAILABLE: '#71BF44',
  DEFAULT: '#CBD5E1',
}

export default function PublicMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

  const { stations } = useStations({ is_public: true })

  const availableCount = useMemo(
    () => stations.filter(s => s.station_status === 'AVAILABLE').length,
    [stations]
  )

  // Initialize map
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-80.8431, 35.2271],
      zoom: 11,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right'
    )

    const SOURCE_ID = 'public-stations'
    const LAYER_ID = 'public-circles'

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'status'], 'AVAILABLE'], 9, 5],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['==', ['get', 'status'], 'AVAILABLE'], 2.5, 1],
          'circle-opacity': ['case', ['==', ['get', 'status'], 'AVAILABLE'], 1, 0.5],
        },
      })

      map.on('click', LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return
        const feature = e.features[0]
        const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const p = feature.properties!

        if (popupRef.current) popupRef.current.remove()

        const statusColor = p.status === 'AVAILABLE' ? STATUS_COLORS.AVAILABLE : STATUS_COLORS.DEFAULT
        const updatedAt = p.updated_at
          ? new Date(p.updated_at as string).toLocaleString()
          : new Date().toLocaleString()

        const popup = new mapboxgl.Popup({ maxWidth: '280px' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px">${p.name}</div>
              <div style="color:#666;margin-bottom:8px">${p.address}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusColor}"></span>
                <span style="font-weight:600;color:${statusColor}">${p.status}</span>
              </div>
              <div style="color:#999;font-size:11px">Last updated: ${updatedAt}</div>
            </div>
          `)
          .addTo(map)

        popupRef.current = popup
      })

      map.on('mouseenter', LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })

      setMapLoaded(true)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token])

  // Update source data when stations change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const source = mapRef.current.getSource('public-stations') as mapboxgl.GeoJSONSource | undefined
    if (!source) return

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: stations
        .filter(s => s.station_lat != null && s.station_lng != null)
        .map(s => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [s.station_lng, s.station_lat],
          },
          properties: {
            id: s.id,
            name: s.evse_name,
            address: s.station_address,
            status: s.station_status,
            color: s.station_status === 'AVAILABLE' ? STATUS_COLORS.AVAILABLE : STATUS_COLORS.DEFAULT,
            updated_at: s.last_status_change || new Date().toISOString(),
          },
        })),
    }

    source.setData(geojson)
  }, [stations, mapLoaded])

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Mapbox token not configured</p>
          <p className="text-sm mt-1">Set VITE_MAPBOX_TOKEN in your .env file</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/crown-black.png" alt="Charlotte Crown" className="w-8 h-8" />
          <h1 className="text-base sm:text-lg font-bold text-gray-900">
            Charlotte EV Charger Availability
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {availableCount} Available Now
        </span>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-400">
        Data updates every 15 minutes &middot; City of Charlotte &middot; charlottenc.gov
      </footer>
    </div>
  )
}
