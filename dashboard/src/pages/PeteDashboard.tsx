import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { api } from '../lib/api'
import { Download, Search, ChevronDown, ChevronRight } from 'lucide-react'
import EmptyState from '../components/EmptyState'

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly'

type UsageRow = {
  period: string
  station_id: string
  station_name: string
  location: string
  address: string
  kwh: number
  sessions: number
  cost: number
}

type LocationRow = {
  location: string
  address: string
  station_count: number
  total_kwh: number
  total_sessions: number
  total_cost: number
}

type UsageResponse = {
  usage: UsageRow[]
  by_location: LocationRow[]
  totals: {
    total_kwh: number
    total_sessions: number
    total_cost: number
  }
}

type SortKey<T> = keyof T
type SortDir = 'asc' | 'desc'

function useSortable<T>(data: T[], defaultKey: SortKey<T>, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<SortKey<T>>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [data, sortKey, sortDir])

  function toggleSort(key: SortKey<T>) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return { sorted, sortKey, sortDir, toggleSort }
}

function SortHeader<T>({ label, field, sortKey, sortDir, onSort, align = 'left' }: {
  label: string
  field: SortKey<T>
  sortKey: SortKey<T>
  sortDir: SortDir
  onSort: (k: SortKey<T>) => void
  align?: 'left' | 'right'
}) {
  const active = field === sortKey
  return (
    <th
      className={`px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-charlotte-green-dark select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(field)}
    >
      {label}
      {active && (
        <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  )
}

export default function PeteDashboard() {
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tab, setTab] = useState<'location' | 'station'>('location')
  const [search, setSearch] = useState('')
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      granularity,
      start_date: startDate,
      end_date: endDate,
    })
    api.get<UsageResponse>(`/api/stats/usage?${params}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [granularity, startDate, endDate])

  // Aggregate stations across all periods for table views
  const stationAgg = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { station_id: string; station_name: string; location: string; address: string; kwh: number; sessions: number; cost: number }>()
    for (const row of data.usage) {
      if (!map.has(row.station_id)) {
        map.set(row.station_id, { station_id: row.station_id, station_name: row.station_name, location: row.location, address: row.address, kwh: 0, sessions: 0, cost: 0 })
      }
      const e = map.get(row.station_id)!
      e.kwh += row.kwh
      e.sessions += row.sessions
      e.cost += row.cost
    }
    return Array.from(map.values()).map(s => ({
      ...s,
      kwh: Math.round(s.kwh * 100) / 100,
      cost: Math.round(s.cost * 100) / 100,
      avg_kwh: s.sessions > 0 ? Math.round((s.kwh / s.sessions) * 100) / 100 : 0,
    }))
  }, [data])

  const locationData = useMemo(() => {
    if (!data) return []
    return data.by_location.map(l => ({
      ...l,
      avg_kwh_station: l.station_count > 0 ? Math.round((l.total_kwh / l.station_count) * 100) / 100 : 0,
    }))
  }, [data])

  // Filter by search
  const filteredLocations = useMemo(() => {
    if (!search) return locationData
    const q = search.toLowerCase()
    return locationData.filter(l => l.location.toLowerCase().includes(q) || l.address.toLowerCase().includes(q))
  }, [locationData, search])

  const filteredStations = useMemo(() => {
    if (!search) return stationAgg
    const q = search.toLowerCase()
    return stationAgg.filter(s => s.station_name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
  }, [stationAgg, search])

  // Sortable tables
  const locSort = useSortable(filteredLocations, 'total_kwh' as any)
  const staSort = useSortable(filteredStations, 'kwh' as any)

  // Chart data
  const locationChartData = useMemo(() =>
    [...locationData].sort((a, b) => b.total_kwh - a.total_kwh).slice(0, 15),
    [locationData]
  )
  const stationChartData = useMemo(() =>
    [...stationAgg].sort((a, b) => b.kwh - a.kwh).slice(0, 20),
    [stationAgg]
  )

  const totals = data?.totals ?? { total_kwh: 0, total_sessions: 0, total_cost: 0 }
  const avgKwhPerSession = totals.total_sessions > 0
    ? Math.round((totals.total_kwh / totals.total_sessions) * 100) / 100
    : 0

  function toggleLocation(loc: string) {
    setExpandedLocations(prev => {
      const next = new Set(prev)
      if (next.has(loc)) next.delete(loc)
      else next.add(loc)
      return next
    })
  }

  function stationsForLocation(loc: string) {
    return stationAgg.filter(s => s.location === loc)
  }

  function exportCsv() {
    const rows = tab === 'location'
      ? [
          'Location,Address,Stations,Total kWh,Total Sessions,Total Cost',
          ...locationData.map(l =>
            [l.location, `"${l.address}"`, l.station_count, l.total_kwh, l.total_sessions, l.total_cost].join(',')
          ),
        ]
      : [
          'Station Name,Location,Address,Total kWh,Sessions,Cost,Avg kWh/Session',
          ...stationAgg.map(s =>
            [s.station_name, s.location, `"${s.address}"`, s.kwh, s.sessions, s.cost, s.avg_kwh].join(',')
          ),
        ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clt-ev-usage-${tab}-${granularity}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const granularityOptions: { key: Granularity; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charlotte-black">Usage Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">kWh consumption by station and location</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Granularity toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {granularityOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setGranularity(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  granularity === opt.key
                    ? 'bg-charlotte-green-dark text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
            />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total kWh', value: totals.total_kwh.toLocaleString(undefined, { maximumFractionDigits: 1 }), color: 'border-charlotte-green-dark' },
          { label: 'Total Sessions', value: totals.total_sessions.toLocaleString(), color: 'border-charlotte-blue' },
          { label: 'Est. Cost', value: `$${totals.total_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'border-charlotte-orange' },
          { label: 'Avg kWh / Session', value: avgKwhPerSession.toLocaleString(undefined, { maximumFractionDigits: 2 }), color: 'border-charlotte-purple' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-xl border-l-4 ${kpi.color} border border-gray-200 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-charlotte-black">{loading ? '...' : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search + Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['location', 'station'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t
                  ? 'bg-white text-charlotte-navy shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'location' ? 'By Location' : 'By Station'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark w-48"
            />
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-charlotte-green-dark transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-charlotte-green-dark" />
        </div>
      ) : !data ? (
        <EmptyState title="Failed to load usage data" />
      ) : tab === 'location' ? (
        <>
          {/* Location bar chart */}
          {locationChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-charlotte-black mb-4">Top Locations by kWh</h3>
              <div style={{ width: '100%', height: Math.max(200, locationChartData.length * 32) }}>
                <ResponsiveContainer>
                  <BarChart data={locationChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="location" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />
                    <Bar dataKey="total_kwh" fill="#24824A" radius={[0, 4, 4, 0]} name="kWh" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Location table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 w-8"></th>
                    <SortHeader label="Location" field={'location' as any} {...locSort} onSort={locSort.toggleSort} />
                    <SortHeader label="Address" field={'address' as any} {...locSort} onSort={locSort.toggleSort} />
                    <SortHeader label="Stations" field={'station_count' as any} {...locSort} onSort={locSort.toggleSort} align="right" />
                    <SortHeader label="Total kWh" field={'total_kwh' as any} {...locSort} onSort={locSort.toggleSort} align="right" />
                    <SortHeader label="Sessions" field={'total_sessions' as any} {...locSort} onSort={locSort.toggleSort} align="right" />
                    <SortHeader label="Cost" field={'total_cost' as any} {...locSort} onSort={locSort.toggleSort} align="right" />
                    <SortHeader label="Avg kWh/Station" field={'avg_kwh_station' as any} {...locSort} onSort={locSort.toggleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {locSort.sorted.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
                  ) : locSort.sorted.map((row: any) => {
                    const expanded = expandedLocations.has(row.location)
                    const stations = expanded ? stationsForLocation(row.location) : []
                    return (
                      <>{/* Fragment key on location */}
                        <tr
                          key={row.location}
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleLocation(row.location)}
                        >
                          <td className="px-4 py-3 text-gray-400">
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-4 py-3 font-medium text-charlotte-black">{row.location}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{row.address}</td>
                          <td className="px-4 py-3 text-right">{row.station_count}</td>
                          <td className="px-4 py-3 text-right font-medium">{row.total_kwh.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{row.total_sessions.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">${row.total_cost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{row.avg_kwh_station.toLocaleString()}</td>
                        </tr>
                        {expanded && stations.map(s => (
                          <tr key={s.station_id} className="border-b border-gray-50 bg-gray-50/50">
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 text-xs text-gray-600 pl-10">{s.station_name}</td>
                            <td className="px-4 py-2 text-xs text-gray-400">{s.address}</td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 text-right text-xs">{s.kwh.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-xs">{s.sessions.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-xs">${s.cost.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-xs">{s.avg_kwh.toLocaleString()}</td>
                          </tr>
                        ))}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Station bar chart */}
          {stationChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-charlotte-black mb-4">Top Stations by kWh</h3>
              <div style={{ width: '100%', height: Math.max(200, stationChartData.length * 32) }}>
                <ResponsiveContainer>
                  <BarChart data={stationChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="station_name" tick={{ fontSize: 10 }} width={200} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />
                    <Bar dataKey="kwh" fill="#24824A" radius={[0, 4, 4, 0]} name="kWh" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Station table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <SortHeader label="Station Name" field={'station_name' as any} {...staSort} onSort={staSort.toggleSort} />
                    <SortHeader label="Location" field={'location' as any} {...staSort} onSort={staSort.toggleSort} />
                    <SortHeader label="Address" field={'address' as any} {...staSort} onSort={staSort.toggleSort} />
                    <SortHeader label="Total kWh" field={'kwh' as any} {...staSort} onSort={staSort.toggleSort} align="right" />
                    <SortHeader label="Sessions" field={'sessions' as any} {...staSort} onSort={staSort.toggleSort} align="right" />
                    <SortHeader label="Cost" field={'cost' as any} {...staSort} onSort={staSort.toggleSort} align="right" />
                    <SortHeader label="Avg kWh/Session" field={'avg_kwh' as any} {...staSort} onSort={staSort.toggleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {staSort.sorted.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
                  ) : staSort.sorted.map((row: any) => (
                    <tr key={row.station_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charlotte-black">{row.station_name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.location}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.address}</td>
                      <td className="px-4 py-3 text-right font-medium">{row.kwh.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.sessions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${row.cost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.avg_kwh.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
