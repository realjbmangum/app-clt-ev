import { useState, useMemo } from 'react'
import { X, MapPin, Clock, Zap, ChevronRight } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import FilterPanel from '../components/FilterPanel'
import DataTable from '../components/DataTable'
import { useStations, useSessions, type StationFilters } from '../lib/hooks'
import type { Station } from '../lib/mock-data'

const FILTER_DEFS = [
  {
    key: 'org',
    label: 'Organization',
    options: [
      { label: 'City of Charlotte', value: 'City of Charlotte' },
      { label: 'Airport', value: 'Charlotte Douglas International Airport' },
      { label: 'Water', value: 'City of Charlotte- Water' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Available', value: 'AVAILABLE' },
      { label: 'Occupied', value: 'OCCUPIED' },
      { label: 'Unreachable', value: 'UNREACHABLE' },
      { label: 'Faulted', value: 'FAULTED' },
    ],
  },
  {
    key: 'is_public',
    label: 'Access',
    options: [
      { label: 'Public', value: 'true' },
      { label: 'Private', value: 'false' },
    ],
  },
  {
    key: 'power_type',
    label: 'Power Type',
    options: [
      { label: 'AC 1-Phase', value: 'AC_1_PHASE' },
      { label: 'AC 3-Phase', value: 'AC_3_PHASE' },
      { label: 'DC Fast', value: 'DC' },
    ],
  },
]

const COLUMNS = [
  { key: 'evse_name', label: 'Name', sortable: true },
  { key: 'station_address', label: 'Address', sortable: true },
  { key: 'org_name', label: 'Org Unit', sortable: true },
  {
    key: 'station_status',
    label: 'Status',
    sortable: true,
    render: (row: Station) => <StatusBadge status={row.station_status} />,
  },
  { key: 'power_type', label: 'Power Type', sortable: true },
  {
    key: 'is_public',
    label: 'Public',
    sortable: true,
    render: (row: Station) => (
      <span className={`text-xs font-medium ${row.is_public ? 'text-charlotte-green-dark' : 'text-gray-400'}`}>
        {row.is_public ? 'Yes' : 'No'}
      </span>
    ),
  },
  { key: 'warranty_type', label: 'Warranty', sortable: true },
  {
    key: 'actions',
    label: '',
    sortable: false,
    render: () => <ChevronRight className="w-4 h-4 text-gray-300" />,
  },
]

export default function StationList() {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  const filters: StationFilters = useMemo(() => ({
    org: filterValues.org || undefined,
    status: filterValues.status ? [filterValues.status] : undefined,
    is_public: filterValues.is_public ? filterValues.is_public === 'true' : null,
    power_type: filterValues.power_type || undefined,
  }), [filterValues])

  const { stations, loading } = useStations(filters)
  const { sessions, loading: sessionsLoading } = useSessions(
    selectedStation?.charger_id
  )

  function handleFilterChange(key: string, value: string) {
    setFilterValues(prev => ({ ...prev, [key]: value }))
  }

  function handleExport() {
    const header = 'Name,Address,Org Unit,Status,Power Type,Public,Warranty'
    const rows = stations.map(s =>
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charlotte-black">Stations</h1>
        <span className="text-sm text-gray-400">{stations.length} stations</span>
      </div>

      <FilterPanel
        filters={FILTER_DEFS}
        values={filterValues}
        onChange={handleFilterChange}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading stations...</div>
      ) : (
        <div className="relative">
          <div
            onClick={(e) => {
              const row = (e.target as HTMLElement).closest('tr')
              if (!row) return
              const idx = Array.from(row.parentElement?.children || []).indexOf(row)
              if (idx >= 0 && stations[idx]) {
                setSelectedStation(stations[idx])
              }
            }}
          >
            <DataTable
              columns={COLUMNS as Parameters<typeof DataTable>[0]['columns']}
              data={stations as unknown as Record<string, unknown>[]}
              pageSize={25}
              onExport={handleExport}
            />
          </div>

          {/* Station detail slide-in panel */}
          {selectedStation && (
            <DetailPanel
              station={selectedStation}
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              onClose={() => setSelectedStation(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function DetailPanel({
  station,
  sessions,
  sessionsLoading,
  onClose,
}: {
  station: Station
  sessions: { session_id: string; start_time: string; end_time: string; energy_kwh: number; cost_usd: number }[]
  sessionsLoading: boolean
  onClose: () => void
}) {
  const lastChanged = station.last_status_change
    ? new Date(station.last_status_change).toLocaleString()
    : 'Unknown'

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-charlotte-black">{station.evse_name}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {station.station_address}, {station.station_city} {station.station_zip}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <StatusBadge status={station.station_status} className="mb-4" />

        {/* Station info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <InfoItem label="Org Unit" value={station.org_name} />
          <InfoItem label="Charger ID" value={station.charger_id} />
          <InfoItem label="Power Type" value={station.power_type} />
          <InfoItem label="Connector" value={station.connector_format} />
          <InfoItem label="Access" value={station.is_public ? 'Public' : 'Private'} />
          <InfoItem label="Warranty" value={station.warranty_type} />
          <InfoItem label="EVSE ID" value={station.evse_id} />
          <InfoItem label="Coordinates" value={`${station.station_lat.toFixed(4)}, ${station.station_lng.toFixed(4)}`} />
        </div>

        {/* Last status change */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
          <Clock className="w-4 h-4" />
          <span>Last status change: {lastChanged}</span>
        </div>

        {/* Recent sessions */}
        <h3 className="text-sm font-semibold text-charlotte-black mb-3 flex items-center gap-1.5">
          <Zap className="w-4 h-4" />
          Recent Sessions
        </h3>

        {sessionsLoading ? (
          <p className="text-sm text-gray-400">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No recent sessions</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const start = new Date(s.start_time)
              const end = new Date(s.end_time)
              const durationMin = Math.round((end.getTime() - start.getTime()) / 60000)
              return (
                <div key={s.session_id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{start.toLocaleDateString()}</span>
                    <span className="text-charlotte-green-dark font-medium">{s.energy_kwh} kWh</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({durationMin}m)</span>
                    <span>${s.cost_usd.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-400 block">{label}</span>
      <span className="text-charlotte-black">{value}</span>
    </div>
  )
}
