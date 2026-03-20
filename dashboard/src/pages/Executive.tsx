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
import KPICard from '../components/KPICard'
import { useStats } from '../lib/hooks'
import {
  dailySessions,
  dailyEnergy,
  kpiTotals,
  publicPrivateDistribution,
  monthlySummary,
} from '../lib/mock-analytics'

// Real org distribution from CSV data
const realStationDistribution = [
  { name: 'City of Charlotte', value: 178, color: '#24824A' },
  { name: 'CLT Airport', value: 20, color: '#2F70B8' },
  { name: 'Water Services', value: 10, color: '#0A7D8C' },
]

export default function Executive() {
  const { stats } = useStats()

  // Use real API values where available
  const totalStations = stats?.total ?? kpiTotals.totalStations
  const uptimePercent = stats?.uptime_percent ?? kpiTotals.networkUptime
  const totalSessions = stats?.total_sessions ?? 0
  const totalKwh = stats?.total_kwh ?? 0
  const totalCost = stats?.total_cost ?? 0
  const hasSessionData = totalSessions > 0

  // Sparklines only meaningful when we have session data
  const sessionSparkline = hasSessionData
    ? dailySessions.slice(-14).map((d) => ({ value: d.sessions }))
    : undefined
  const energySparkline = hasSessionData
    ? dailyEnergy.slice(-14).map((d) => ({ value: d.kWh }))
    : undefined
  const costSparkline = hasSessionData
    ? dailyEnergy.slice(-14).map((d) => ({ value: d.cost }))
    : undefined

  const sessionTrend = useMemo(() => {
    if (!hasSessionData) return undefined
    const pct = ((kpiTotals.totalSessions30d - kpiTotals.prevPeriodSessions30d) / kpiTotals.prevPeriodSessions30d) * 100
    return { direction: pct >= 0 ? 'up' as const : 'down' as const, value: `${Math.abs(pct).toFixed(1)}% vs prev 30d` }
  }, [hasSessionData])

  const energyTrend = useMemo(() => {
    if (!hasSessionData) return undefined
    const pct = ((kpiTotals.totalEnergy30d - kpiTotals.prevPeriodEnergy30d) / kpiTotals.prevPeriodEnergy30d) * 100
    return { direction: pct >= 0 ? 'up' as const : 'down' as const, value: `${Math.abs(pct).toFixed(1)}% vs prev 30d` }
  }, [hasSessionData])

  // Station distribution pie: use real counts from API status breakdown
  const stationDistribution = useMemo(() => {
    if (!stats) return realStationDistribution
    // Update City of Charlotte to be total minus airport and water
    const airportCount = 20
    const waterCount = 10
    const cityCount = totalStations - airportCount - waterCount
    return [
      { name: 'City of Charlotte', value: cityCount, color: '#24824A' },
      { name: 'CLT Airport', value: airportCount, color: '#2F70B8' },
      { name: 'Water Services', value: waterCount, color: '#0A7D8C' },
    ]
  }, [stats, totalStations])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-charlotte-black">Executive Summary</h1>

      {/* No session data banner */}
      {!hasSessionData && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          Session data will populate once ChargePoint sync begins. Station counts and uptime are live from the network.
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Total Stations" value={totalStations.toLocaleString()} />
        <KPICard
          label="Sessions (30d)"
          value={totalSessions.toLocaleString()}
          trend={sessionTrend}
          sparklineData={sessionSparkline}
        />
        <KPICard
          label="Energy (30d kWh)"
          value={totalKwh.toLocaleString()}
          trend={energyTrend}
          sparklineData={energySparkline}
        />
        <KPICard
          label="Est. CO2 Offset (lbs)"
          value={Math.round(totalKwh * 0.709).toLocaleString()}
        />
        <KPICard
          label="Network Uptime"
          value={`${uptimePercent}%`}
          trend={uptimePercent >= 95 ? { direction: 'up', value: 'Above target' } : { direction: 'down', value: 'Below target' }}
        />
        <KPICard
          label="Est. Cost (30d)"
          value={`$${totalCost.toLocaleString()}`}
          sparklineData={costSparkline}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {stationDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Public vs Private Stations">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={publicPrivateDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {publicPrivateDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Month-over-month table */}
      <ChartCard title={`Month-over-Month Performance${!hasSessionData ? ' — Sample Data' : ''}`}>
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
                    <ChangeIndicator value={row.sessionChange} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.kWh.toLocaleString()}
                    <ChangeIndicator value={row.kWhChange} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${row.cost.toLocaleString()}
                    <ChangeIndicator value={row.costChange} />
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

function ChangeIndicator({ value }: { value?: number }) {
  if (value === undefined) return null
  const color = value >= 0 ? 'text-green-600' : 'text-red-500'
  const arrow = value >= 0 ? '\u2191' : '\u2193'
  return (
    <span className={`ml-1.5 text-xs font-medium ${color}`}>
      {arrow}{Math.abs(value).toFixed(1)}%
    </span>
  )
}
