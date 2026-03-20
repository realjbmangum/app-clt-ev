import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useStats } from '../lib/hooks'
import {
  monthlySummary,
  publicPrivateDistribution,
  dailySessions,
  dailyEnergy,
} from '../lib/mock-analytics'
import { FileText, X } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#71BF44',
  OCCUPIED: '#2F70B8',
  UNREACHABLE: '#EA983E',
  FAULTED: '#DE0505',
}

export default function Executive() {
  const { stats } = useStats()
  const [showReport, setShowReport] = useState(false)

  const totalStations = stats?.total ?? 208
  const uptimePercent = stats?.uptime_percent ?? 75.5
  const available = stats?.available ?? 157
  const occupied = stats?.occupied ?? 20
  const unreachable = stats?.unreachable ?? 29
  const faulted = stats?.faulted ?? 2
  const totalSessions = stats?.total_sessions ?? 0
  const totalKwh = stats?.total_kwh ?? 0
  const totalCost = stats?.total_cost ?? 0

  const stationDistribution = [
    { name: 'City of Charlotte', value: totalStations - 20 - 10, color: '#24824A' },
    { name: 'CLT Airport', value: 20, color: '#2F70B8' },
    { name: 'Water Services', value: 10, color: '#0A7D8C' },
  ]

  const statusDistribution = [
    { name: 'Available', value: available, color: STATUS_COLORS.AVAILABLE },
    { name: 'Occupied', value: occupied, color: STATUS_COLORS.OCCUPIED },
    { name: 'Unreachable', value: unreachable, color: STATUS_COLORS.UNREACHABLE },
    { name: 'Faulted', value: faulted, color: STATUS_COLORS.FAULTED },
  ]

  // Period comparison data (task #15)
  const periodComparison = useMemo(() => {
    const last30Sessions = dailySessions.slice(-30).reduce((s, d) => s + d.sessions, 0)
    const prev30Sessions = dailySessions.slice(-60, -30).reduce((s, d) => s + d.sessions, 0)
    const last30kWh = dailyEnergy.slice(-30).reduce((s, d) => s + d.kWh, 0)
    const prev30kWh = dailyEnergy.slice(-60, -30).reduce((s, d) => s + d.kWh, 0)
    const last30Cost = +dailyEnergy.slice(-30).reduce((s, d) => s + d.cost, 0).toFixed(2)
    const prev30Cost = +dailyEnergy.slice(-60, -30).reduce((s, d) => s + d.cost, 0).toFixed(2)
    // Use mock uptime values
    const last30Uptime = 98.4
    const prev30Uptime = 97.1

    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? 0 : +((curr - prev) / prev * 100).toFixed(1)

    return {
      metrics: [
        { label: 'Sessions', current: last30Sessions, previous: prev30Sessions, change: pctChange(last30Sessions, prev30Sessions) },
        { label: 'kWh', current: last30kWh, previous: prev30kWh, change: pctChange(last30kWh, prev30kWh) },
        { label: 'Cost ($)', current: last30Cost, previous: prev30Cost, change: pctChange(last30Cost, prev30Cost) },
        { label: 'Uptime (%)', current: last30Uptime, previous: prev30Uptime, change: pctChange(last30Uptime, prev30Uptime) },
      ],
      chartData: [
        { metric: 'Sessions', 'This Month': last30Sessions, 'Last Month': prev30Sessions },
        { metric: 'kWh', 'This Month': last30kWh, 'Last Month': prev30kWh },
        { metric: 'Cost', 'This Month': last30Cost, 'Last Month': prev30Cost },
      ],
    }
  }, [])

  // Report date range
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

      {/* Period Comparison (task #15) */}
      <ChartCard title="Period Comparison" subtitle="This Month vs Last Month">
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Metric</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">This Month</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Last Month</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {periodComparison.metrics.map((m) => (
                <tr key={m.label} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-charlotte-black">{m.label}</td>
                  <td className="px-4 py-3 text-right">{m.current.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{m.previous.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${m.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.change >= 0 ? '\u2191' : '\u2193'} {Math.abs(m.change)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ width: '100%', height: 256 }}>
          <ResponsiveContainer>
            <BarChart data={periodComparison.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="This Month" fill="#24824A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Last Month" fill="#2F70B8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Month</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Sessions</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">kWh</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Avg Duration</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Uptime %</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map((row) => (
                <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-charlotte-black">{row.month}</td>
                  <td className="px-4 py-3 text-right">
                    {row.sessions.toLocaleString()}
                    <Change value={row.sessionChange} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.kWh.toLocaleString()}
                    <Change value={row.kWhChange} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${row.cost.toLocaleString()}
                    <Change value={row.costChange} />
                  </td>
                  <td className="px-4 py-3 text-right">{row.avgDuration} min</td>
                  <td className="px-4 py-3 text-right">{row.uptime}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* PDF Report Modal (task #14) */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-500">Report Preview</span>
              <button onClick={() => setShowReport(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Print-friendly report content */}
            <div className="px-10 py-8 space-y-8">
              {/* Logo and title */}
              <div className="text-center space-y-3">
                <img src="/crown-black.png" alt="City of Charlotte" className="h-16 mx-auto" />
                <h2 className="text-2xl font-bold text-charlotte-black">EV Charging Network &mdash; Monthly Report</h2>
                <p className="text-sm text-gray-500">{reportMonth}</p>
              </div>

              <hr className="border-gray-200" />

              {/* KPI Summary Grid */}
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

              {/* Station Status Breakdown */}
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
                        <td className="px-4 py-2 text-right">{((s.value / totalStations) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal footer */}
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

function Change({ value }: { value?: number }) {
  if (value === undefined) return null
  const color = value >= 0 ? 'text-green-600' : 'text-red-500'
  const arrow = value >= 0 ? '\u2191' : '\u2193'
  return <span className={`ml-1.5 text-xs font-medium ${color}`}>{arrow}{Math.abs(value).toFixed(1)}%</span>
}
