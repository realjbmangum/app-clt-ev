import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useStations, useStats, useUtilizationStats, type StationFilters } from '../lib/hooks'
import type { Station } from '../lib/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

const SOURCE_ID = 'stations'
const LAYER_ID = 'station-circles'

function buildGeoJSON(stations: Station[]): GeoJSON.FeatureCollection {
  return {
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
          org: s.org_name,
          power_type: s.power_type,
          connector: s.connector_format,
          is_public: !!s.is_public,
          color: STATUS_COLORS[s.station_status] || '#999',
        },
      })),
  }
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mapStyle, setMapStyle] = useState('light-v11')
  const [filters, setFilters] = useState<StationFilters>({
    org: 'All',
    status: [...STATUS_OPTIONS],
    is_public: null,
    power_type: '',
  })

  const [utilizationFilter, setUtilizationFilter] = useState<'' | 'top20' | 'bottom20'>('')

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

  const { stations: allStations } = useStations(filters)
  const { stats } = useStats()
  const { data: utilData } = useUtilizationStats()

  // Apply utilization filter
  const stations = useMemo(() => {
    if (!utilizationFilter || !utilData) return allStations
    const ids = new Set(
      (utilizationFilter === 'top20' ? utilData.top_stations : utilData.bottom_stations)
        .map((s: any) => s.station_charger_id)
    )
    return allStations.filter(s => ids.has(s.charger_id))
  }, [allStations, utilizationFilter, utilData])

  function toggleStatus(status: string) {
    setFilters(prev => {
      const current = prev.status || []
      const next = current.includes(status)
        ? current.filter(s => s !== status)
        : [...current, status]
      return { ...prev, status: next }
    })
  }

  // Initialize map
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-80.8431, 35.2271],
      zoom: 11,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 150 }), 'bottom-right')
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'top-right')

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#24824A',
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30, 30, 36],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.85,
        },
      })

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Individual station dots (unclustered)
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9,
        },
      })

      setMapLoaded(true)
    })

    // Click cluster to zoom in
    map.on('click', 'clusters', (e: mapboxgl.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      if (!features.length) return
      const clusterId = features[0].properties?.cluster_id
      const source = map.getSource(SOURCE_ID) as any
      source?.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
        })
      })
    })

    // Click individual station for popup
    map.on('click', LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return
      const feature = e.features[0]
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
      const p = feature.properties!

      if (popupRef.current) popupRef.current.remove()

      const popup = new mapboxgl.Popup({ maxWidth: '320px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family:sans-serif;font-size:13px;line-height:1.5">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.name}</div>
            <div style="color:#666">${p.address}</div>
            <div style="margin-top:8px;display:grid;grid-template-columns:auto 1fr;gap:2px 12px">
              <span style="color:#888">Status</span>
              <span style="font-weight:500;color:${p.color}">${p.status}</span>
              <span style="color:#888">Org</span>
              <span>${p.org}</span>
              <span style="color:#888">Power</span>
              <span>${p.power_type}</span>
              <span style="color:#888">Connector</span>
              <span>${p.connector}</span>
              <span style="color:#888">Access</span>
              <span>${p.is_public === 'true' || p.is_public === true ? 'Public' : 'Private'}</span>
            </div>
          </div>
        `)
        .addTo(map)

      popupRef.current = popup
    })

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
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
    const source = mapRef.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(buildGeoJSON(stations))
    }
  }, [stations, mapLoaded])

  // Switch map style
  function handleStyleChange(style: string) {
    setMapStyle(style)
    const map = mapRef.current
    if (!map) return
    map.setStyle(`mapbox://styles/mapbox/${style}`)
    map.once('style.load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildGeoJSON(stations),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#24824A',
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30, 30, 36],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.85,
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9,
        },
      })
    })
  }

  // Resize map when sidebar toggles
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev)
    setTimeout(() => mapRef.current?.resize(), 310)
  }, [])

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Mapbox token not configured</p>
          <p className="text-sm mt-1">Set VITE_MAPBOX_TOKEN in your .env file</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      {/* Mobile backdrop for filter sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar filter panel */}
      <div
        className={`absolute top-0 left-0 z-[1000] h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ${
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

          {/* Utilization */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Utilization</label>
            <select
              value={utilizationFilter}
              onChange={e => setUtilizationFilter(e.target.value as '' | 'top20' | 'bottom20')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
            >
              <option value="">All Stations</option>
              <option value="top20">Top 20 (Most Used)</option>
              <option value="bottom20">Bottom 20 (Least Used)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sidebar toggle */}
      <button
        onClick={handleSidebarToggle}
        className={`absolute z-[1001] top-4 bg-white border border-gray-200 shadow rounded-r-lg p-1.5 hover:bg-gray-50 transition-all ${
          sidebarOpen ? 'left-72' : 'left-0'
        }`}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Map area */}
      <div className="flex-1 flex flex-col">
        {/* Status summary bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center gap-3 md:gap-6 text-sm z-[1000]">
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
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Style switcher */}
          <div className="absolute bottom-6 left-4 z-[1000] flex bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {[
              { id: 'light-v11', label: 'Light' },
              { id: 'streets-v12', label: 'Streets' },
              { id: 'satellite-streets-v12', label: 'Satellite' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => handleStyleChange(s.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mapStyle === s.id
                    ? 'bg-charlotte-green-dark text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
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
