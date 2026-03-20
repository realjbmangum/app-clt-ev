import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useStations, useStats, type StationFilters } from '../lib/hooks'
import type { Station } from '../lib/mock-data'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Set via VITE_MAPBOX_TOKEN env var. Leave empty for development — map will show placeholder.
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#71BF44',
  OCCUPIED: '#2F70B8',
  UNREACHABLE: '#EA983E',
  FAULTED: '#DE0505',
}

const ORG_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'City of Charlotte', value: 'City of Charlotte' },
  { label: 'Airport', value: 'Charlotte Douglas International Airport' },
  { label: 'Water', value: 'City of Charlotte- Water' },
]

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'UNREACHABLE', 'FAULTED'] as const

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filters, setFilters] = useState<StationFilters>({
    org: 'All',
    status: [...STATUS_OPTIONS],
    is_public: null,
    power_type: '',
  })

  const { stations } = useStations(filters)
  const { stats } = useStats()

  const buildGeoJSON = useCallback((data: Station[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: data
      .filter(s => s.station_lat && s.station_lng)
      .map(s => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.station_lng, s.station_lat] },
        properties: {
          id: s.id,
          evse_name: s.evse_name,
          address: s.station_address,
          status: s.station_status,
          org_name: s.org_name,
          power_type: s.power_type,
          connector_format: s.connector_format,
          is_public: s.is_public,
          color: STATUS_COLORS[s.station_status] || '#999',
        },
      })),
  }), [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    if (!MAPBOX_TOKEN) return

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-80.8431, 35.2271],
      zoom: 11,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource('stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'station-circles',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9,
        },
      })

      map.on('click', 'station-circles', (e) => {
        if (!e.features?.length) return
        const f = e.features[0]
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const p = f.properties!

        if (popupRef.current) popupRef.current.remove()

        popupRef.current = new mapboxgl.Popup({ offset: 15, maxWidth: '320px' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: sans-serif; font-size: 13px; line-height: 1.5;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${p.evse_name}</div>
              <div style="color: #666;">${p.address}</div>
              <div style="margin-top: 8px; display: grid; grid-template-columns: auto 1fr; gap: 2px 12px;">
                <span style="color: #888;">Status</span>
                <span style="font-weight: 500; color: ${STATUS_COLORS[p.status] || '#999'};">${p.status}</span>
                <span style="color: #888;">Org</span>
                <span>${p.org_name}</span>
                <span style="color: #888;">Power</span>
                <span>${p.power_type}</span>
                <span style="color: #888;">Connector</span>
                <span>${p.connector_format}</span>
                <span style="color: #888;">Access</span>
                <span>${p.is_public === 'true' || p.is_public === true ? 'Public' : 'Private'}</span>
              </div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'station-circles', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'station-circles', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update map data when stations change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const update = () => {
      const source = map.getSource('stations') as mapboxgl.GeoJSONSource | undefined
      if (source) {
        source.setData(buildGeoJSON(stations))
      }
    }

    if (map.isStyleLoaded()) {
      update()
    } else {
      map.on('load', update)
    }
  }, [stations, buildGeoJSON])

  function toggleStatus(status: string) {
    setFilters(prev => {
      const current = prev.status || []
      const next = current.includes(status)
        ? current.filter(s => s !== status)
        : [...current, status]
      return { ...prev, status: next }
    })
  }

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      {/* Sidebar filter panel */}
      <div
        className={`absolute top-0 left-0 z-10 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ${
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="p-4 space-y-5 w-72">
          <h3 className="text-sm font-semibold text-charlotte-black uppercase tracking-wider">Filters</h3>

          {/* Org Unit */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Organization</label>
            <select
              value={filters.org || 'All'}
              onChange={e => setFilters(f => ({ ...f, org: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
            >
              {ORG_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Status checkboxes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map(status => (
                <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) ?? true}
                    onChange={() => toggleStatus(status)}
                    className="rounded border-gray-300 text-charlotte-green-dark focus:ring-charlotte-green-dark"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Public/Private */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Access</label>
            <select
              value={filters.is_public === null ? '' : String(filters.is_public)}
              onChange={e => {
                const v = e.target.value
                setFilters(f => ({ ...f, is_public: v === '' ? null : v === 'true' }))
              }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
            >
              <option value="">All</option>
              <option value="true">Public</option>
              <option value="false">Private</option>
            </select>
          </div>

          {/* Power Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Power Type</label>
            <select
              value={filters.power_type || ''}
              onChange={e => setFilters(f => ({ ...f, power_type: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
            >
              <option value="">All</option>
              <option value="AC_1_PHASE">AC 1-Phase</option>
              <option value="AC_3_PHASE">AC 3-Phase</option>
              <option value="DC">DC Fast</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute z-20 top-4 bg-white border border-gray-200 shadow rounded-r-lg p-1.5 hover:bg-gray-50 transition-all ${
          sidebarOpen ? 'left-72' : 'left-0'
        }`}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Map area */}
      <div className="flex-1 flex flex-col">
        {/* Status summary bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-6 text-sm z-10">
          {stats && (
            <>
              <StatusCount label="Available" count={stats.available} color={STATUS_COLORS.AVAILABLE} />
              <StatusCount label="Occupied" count={stats.occupied} color={STATUS_COLORS.OCCUPIED} />
              <StatusCount label="Unreachable" count={stats.unreachable} color={STATUS_COLORS.UNREACHABLE} />
              <StatusCount label="Faulted" count={stats.faulted} color={STATUS_COLORS.FAULTED} />
              <span className="ml-auto text-gray-400 text-xs">{stats.total} total stations</span>
            </>
          )}
        </div>

        {/* Map container */}
        {MAPBOX_TOKEN ? (
          <div ref={mapContainer} className="flex-1" />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">Map requires Mapbox token</p>
              <p className="text-sm mt-1">Set VITE_MAPBOX_TOKEN in your .env file</p>
              <p className="text-xs mt-3 text-gray-400">{stations.length} stations loaded</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium text-charlotte-black">{count}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  )
}
