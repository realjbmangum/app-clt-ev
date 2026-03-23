import { useState, useMemo } from 'react'
import { X, MapPin, Clock, Zap, ChevronRight, Search, Download, ChevronUp, ChevronDown, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import StatusBadge from '../components/StatusBadge'
import { useStations, useSessions, useStats, type StationFilters } from '../lib/hooks'
import type { Station } from '../lib/types'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#71BF44',
  OCCUPIED: '#2F70B8',
  UNREACHABLE: '#EA983E',
  FAULTED: '#DE0505',
}

const ORG_OPTIONS = [
  { label: 'City of Charlotte', value: 'City of Charlotte' },
  { label: 'Airport', value: 'Charlotte Douglas International Airport' },
  { label: 'Water', value: 'City of Charlotte- Water' },
]

const STATUS_OPTIONS = [
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Occupied', value: 'OCCUPIED' },
  { label: 'Unreachable', value: 'UNREACHABLE' },
  { label: 'Faulted', value: 'FAULTED' },
]

export default function StationList() {
  const [orgFilter, setOrgFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [accessFilter, setAccessFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string>('evse_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const pageSize = 25

  const { stats } = useStats()

  const filters: StationFilters = useMemo(() => ({
    org: orgFilter || undefined,
    status: statusFilter ? [statusFilter] : undefined,
    is_public: accessFilter === '' ? null : accessFilter === 'true',
    search: search || undefined,
  }), [orgFilter, statusFilter, accessFilter, search])

  const { stations, loading } = useStations(filters)
  const { sessions, loading: sessionsLoading } = useSessions(selectedStation?.charger_id)

  const sorted = useMemo(() => {
    const s = [...stations]
    s.sort((a, b) => {
      const av = (a as any)[sortKey] ?? ''
      const bv = (b as any)[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return s
  }, [stations, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  function handleExport() {
    const header = 'Name,Address,Org Unit,Status,Power Type,Public,Warranty'
    const rows = sorted.map(s =>
      [s.evse_name, s.station_address, s.org_name, s.station_status, s.power_type, s.is_public ? 'Yes' : 'No', s.warranty_type]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clt-ev-stations.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charlotte-black">Stations</h1>
        <span className="text-sm text-gray-400">{stations.length} stations</span>
      </div>

      {/* KPI Cards + Pie Chart */}
      {stats && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Stations', value: stats.total, color: '#6B7280', status: '' },
              { label: 'Available', value: stats.available, color: STATUS_COLORS.AVAILABLE, status: 'AVAILABLE' },
              { label: 'Occupied', value: stats.occupied, color: STATUS_COLORS.OCCUPIED, status: 'OCCUPIED' },
              { label: 'Unreachable', value: stats.unreachable, color: STATUS_COLORS.UNREACHABLE, status: 'UNREACHABLE' },
              { label: 'Faulted', value: stats.faulted, color: STATUS_COLORS.FAULTED, status: 'FAULTED' },
            ].map(kpi => (
              <button
                key={kpi.label}
                onClick={() => {
                  if (!kpi.status) { setStatusFilter(''); setPage(0); return }
                  setStatusFilter(prev => prev === kpi.status ? '' : kpi.status)
                  setPage(0)
                }}
                className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                  statusFilter === kpi.status && kpi.status
                    ? 'border-l-4'
                    : 'border-gray-200'
                }`}
                style={statusFilter === kpi.status && kpi.status ? { borderLeftColor: kpi.color } : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: kpi.color }} />
                  <span className="text-xs text-gray-500">{kpi.label}</span>
                </div>
                <span className="text-2xl font-semibold text-charlotte-black">{kpi.value}</span>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center w-full md:w-[160px]">
            <div className="relative">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Available', value: stats.available, status: 'AVAILABLE' },
                      { name: 'Occupied', value: stats.occupied, status: 'OCCUPIED' },
                      { name: 'Unreachable', value: stats.unreachable, status: 'UNREACHABLE' },
                      { name: 'Faulted', value: stats.faulted, status: 'FAULTED' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(entry) => {
                      const status = entry.status as string
                      setStatusFilter(prev => prev === status ? '' : status)
                      setPage(0)
                    }}
                    cursor="pointer"
                  >
                    {['AVAILABLE', 'OCCUPIED', 'UNREACHABLE', 'FAULTED'].map(s => (
                      <Cell key={s} fill={STATUS_COLORS[s]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-lg font-semibold text-charlotte-black">{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <select value={orgFilter} onChange={e => { setOrgFilter(e.target.value); setPage(0) }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
          <option value="">All Orgs</option>
          {ORG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={accessFilter} onChange={e => { setAccessFilter(e.target.value); setPage(0) }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
          <option value="">All Access</option>
          <option value="true">Public</option>
          <option value="false">Private</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading stations...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search stations..."
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
              />
            </div>
            <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-charlotte-green-dark">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { key: 'evse_name', label: 'Name' },
                    { key: 'station_address', label: 'Address' },
                    { key: 'org_name', label: 'Org Unit' },
                    { key: 'station_status', label: 'Status' },
                    { key: 'power_type', label: 'Power Type' },
                    { key: 'is_public', label: 'Public' },
                    { key: 'warranty_type', label: 'Warranty' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-charlotte-black">
                      <div className="flex items-center gap-1">{col.label} <SortIcon col={col.key} /></div>
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paged.map(station => (
                  <tr key={station.id} onClick={() => setSelectedStation(station)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-charlotte-black">{station.evse_name}</td>
                    <td className="px-4 py-3 text-gray-600">{station.station_address}</td>
                    <td className="px-4 py-3 text-gray-600">{station.org_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={station.station_status} /></td>
                    <td className="px-4 py-3 text-gray-600">{station.power_type}</td>
                    <td className="px-4 py-3">
                      <span className={station.is_public ? 'text-charlotte-green-dark font-medium' : 'text-gray-400'}>
                        {station.is_public ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{station.warranty_type}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No stations found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{sorted.length} stations</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span>Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedStation && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-charlotte-black">{selectedStation.evse_name}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedStation.station_address}, {selectedStation.station_city} {selectedStation.station_zip}
                </p>
              </div>
              <button onClick={() => setSelectedStation(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <StatusBadge status={selectedStation.station_status} className="mb-4" />

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <Info label="Org Unit" value={selectedStation.org_name || '—'} />
              <Info label="Charger ID" value={selectedStation.charger_id || '—'} />
              <Info label="Power Type" value={selectedStation.power_type || '—'} />
              <Info label="Connector" value={selectedStation.connector_format || '—'} />
              <Info label="Access" value={selectedStation.is_public ? 'Public' : 'Private'} />
              <Info label="Warranty" value={selectedStation.warranty_type || '—'} />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
              <Clock className="w-4 h-4" />
              <span>Last change: {selectedStation.last_status_change ? new Date(selectedStation.last_status_change).toLocaleString() : 'Unknown'}</span>
            </div>

            <h3 className="text-sm font-semibold text-charlotte-black mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Recent Sessions
            </h3>

            {sessionsLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-400">No recent sessions</p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.session_id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{new Date(s.start_time).toLocaleDateString()}</span>
                      <span className="text-charlotte-green-dark font-medium">{s.energy_kwh} kWh</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)}m</span>
                      <span>${s.cost_usd.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link
                to="/maintenance"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Wrench className="w-4 h-4" /> Report Issue
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-400 block">{label}</span>
      <span className="text-charlotte-black">{value}</span>
    </div>
  )
}
