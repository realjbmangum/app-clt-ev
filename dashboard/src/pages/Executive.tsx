import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import EmptyState from '../components/EmptyState'
import { useStats, useStations } from '../lib/hooks'
import { FileText, X } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#71BF44',
  OCCUPIED: '#2F70B8',
  UNREACHABLE: '#EA983E',
  FAULTED: '#DE0505',
}

const ORG_COLORS = ['#24824A', '#2F70B8', '#0A7D8C', '#EA983E', '#7C3AED', '#DE0505']

export default function Executive() {
  const { stats } = useStats()
  const { stations } = useStations()
  const [showReport, setShowReport] = useState(false)

  const totalStations = stats?.total ?? 0
  const uptimePercent = stats?.uptime_percent ?? 0
  const available = stats?.available ?? 0
  const occupied = stats?.occupied ?? 0
  const unreachable = stats?.unreachable ?? 0
  const faulted = stats?.faulted ?? 0
  const totalSessions = stats?.total_sessions ?? 0
  const totalKwh = stats?.total_kwh ?? 0
  const totalCost = stats?.total_cost ?? 0

  // Compute org distribution dynamically from station data
  const stationDistribution = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of stations) {
      const org = s.org_name?.trim() || 'Unknown'
      map.set(org, (map.get(org) || 0) + 1)
    }
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .map((entry, i) => ({ ...entry, color: ORG_COLORS[i % ORG_COLORS.length] }))
  }, [stations])

  const statusDistribution = [
    { name: 'Available', value: available, color: STATUS_COLORS.AVAILABLE },
    { name: 'Occupied', value: occupied, color: STATUS_COLORS.OCCUPIED },
    { name: 'Unreachable', value: unreachable, color: STATUS_COLORS.UNREACHABLE },
    { name: 'Faulted', value: faulted, color: STATUS_COLORS.FAULTED },
  ]

  // Public vs Private computed from real station data
  const publicCount = stations.filter(s => s.is_public).length
  const privateCount = stations.length - publicCount
  const publicPrivateDistribution = [
    { name: 'Public', value: publicCount, color: '#24824A' },
    { name: 'Private', value: privateCount, color: '#2F70B8' },
  ]

  const now = new Date()
  const reportMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charlotte-black">Executive Summary</h1>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-charlotte-green-dark text-white text-sm font-medium rounded-lg hover:bg-charlotte-green-legacy transition-colors"
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPI label="Total Stations" value={totalStations.toLocaleString()} />
        <KPI label="Available" value={available.toLocaleString()} accent="#71BF44" />
        <KPI label="Network Uptime" value={`${uptimePercent}%`} accent={uptimePercent >= 90 ? '#71BF44' : '#EA983E'} />
        <KPI label="Sessions" value={totalSessions.toLocaleString()} sub={totalSessions === 0 ? 'Awaiting sync' : undefined} />
        <KPI label="Energy (kWh)" value={totalKwh.toLocaleString()} sub={totalKwh === 0 ? 'Awaiting sync' : undefined} />
        <KPI label="Est. Cost" value={`$${totalCost.toLocaleString()}`} sub={totalCost === 0 ? 'Awaiting sync' : undefined} />
      </div>

      {/* Period Comparison */}
      <ChartCard title="Period Comparison" subtitle="This Month vs Last Month">
        {totalSessions === 0 ? (
          <EmptyState title="Period comparison will be available once session data is synced" />
        ) : (
          <EmptyState title="Period comparison will be available once session data is synced" />
        )}
      </ChartCard>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Stations by Org Unit">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stationDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {stationDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Station Status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Public vs Private">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={publicPrivateDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {publicPrivateDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Month-over-month table */}
      <ChartCard title="Month-over-Month Performance">
        <EmptyState title="Monthly trends will populate once session data begins syncing" />
      </ChartCard>

      {/* PDF Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-500">Report Preview</span>
              <button onClick={() => setShowReport(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-10 py-8 space-y-8">
              <div className="text-center space-y-3">
                <img src="/crown-black.png" alt="City of Charlotte" className="h-16 mx-auto" />
                <h2 className="text-2xl font-bold text-charlotte-black">EV Charging Network &mdash; Monthly Report</h2>
                <p className="text-sm text-gray-500">{reportMonth}</p>
              </div>

              <hr className="border-gray-200" />

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Key Performance Indicators</h3>
                <div className="grid grid-cols-3 gap-4">
                  <ReportKPI label="Total Stations" value={totalStations.toLocaleString()} />
                  <ReportKPI label="Available" value={available.toLocaleString()} />
                  <ReportKPI label="Uptime" value={`${uptimePercent}%`} />
                  <ReportKPI label="Sessions" value={totalSessions > 0 ? totalSessions.toLocaleString() : 'N/A'} />
                  <ReportKPI label="Energy (kWh)" value={totalKwh > 0 ? totalKwh.toLocaleString() : 'N/A'} />
                  <ReportKPI label="Est. Cost" value={totalCost > 0 ? `$${totalCost.toLocaleString()}` : 'N/A'} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Station Status Breakdown</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Count</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusDistribution.map((s) => (
                      <tr key={s.name} className="border-b border-gray-50">
                        <td className="px-4 py-2 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </td>
                        <td className="px-4 py-2 text-right">{s.value}</td>
                        <td className="px-4 py-2 text-right">{totalStations > 0 ? ((s.value / totalStations) * 100).toFixed(1) : '0.0'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-charlotte-green-dark text-white text-sm font-medium rounded-lg opacity-75 cursor-default">
                  <FileText className="w-4 h-4" />
                  Download PDF
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-charlotte-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Coming in Phase 2
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KPI({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function ReportKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-charlotte-black">{value}</p>
    </div>
  )
}
