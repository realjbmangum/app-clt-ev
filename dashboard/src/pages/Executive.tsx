import { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useStats } from '../lib/hooks'
import {
  monthlySummary,
  publicPrivateDistribution,
} from '../lib/mock-analytics'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#71BF44',
  OCCUPIED: '#2F70B8',
  UNREACHABLE: '#EA983E',
  FAULTED: '#DE0505',
}

export default function Executive() {
  const { stats } = useStats()

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-charlotte-black">Executive Summary</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPI label="Total Stations" value={totalStations.toLocaleString()} />
        <KPI label="Available" value={available.toLocaleString()} accent="#71BF44" />
        <KPI label="Network Uptime" value={`${uptimePercent}%`} accent={uptimePercent >= 90 ? '#71BF44' : '#EA983E'} />
        <KPI label="Sessions" value={totalSessions.toLocaleString()} sub={totalSessions === 0 ? 'Awaiting sync' : undefined} />
        <KPI label="Energy (kWh)" value={totalKwh.toLocaleString()} sub={totalKwh === 0 ? 'Awaiting sync' : undefined} />
        <KPI label="Est. Cost" value={`$${totalCost.toLocaleString()}`} sub={totalCost === 0 ? 'Awaiting sync' : undefined} />
      </div>

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

function Change({ value }: { value?: number }) {
  if (value === undefined) return null
  const color = value >= 0 ? 'text-green-600' : 'text-red-500'
  const arrow = value >= 0 ? '\u2191' : '\u2193'
  return <span className={`ml-1.5 text-xs font-medium ${color}`}>{arrow}{Math.abs(value).toFixed(1)}%</span>
}
