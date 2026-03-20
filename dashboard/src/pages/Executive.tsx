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
import {
  dailySessions,
  dailyEnergy,
  kpiTotals,
  stationDistribution,
  publicPrivateDistribution,
  monthlySummary,
} from '../lib/mock-analytics'

export default function Executive() {
  const sessionSparkline = dailySessions.slice(-14).map((d) => ({ value: d.sessions }))
  const energySparkline = dailyEnergy.slice(-14).map((d) => ({ value: d.kWh }))
  const costSparkline = dailyEnergy.slice(-14).map((d) => ({ value: d.cost }))

  const sessionTrend = useMemo(() => {
    const pct = ((kpiTotals.totalSessions30d - kpiTotals.prevPeriodSessions30d) / kpiTotals.prevPeriodSessions30d) * 100
    return { direction: pct >= 0 ? 'up' as const : 'down' as const, value: `${Math.abs(pct).toFixed(1)}% vs prev 30d` }
  }, [])

  const energyTrend = useMemo(() => {
    const pct = ((kpiTotals.totalEnergy30d - kpiTotals.prevPeriodEnergy30d) / kpiTotals.prevPeriodEnergy30d) * 100
    return { direction: pct >= 0 ? 'up' as const : 'down' as const, value: `${Math.abs(pct).toFixed(1)}% vs prev 30d` }
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-charlotte-black">Executive Summary</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Total Stations" value={kpiTotals.totalStations.toLocaleString()} />
        <KPICard
          label="Sessions (30d)"
          value={kpiTotals.totalSessions30d.toLocaleString()}
          trend={sessionTrend}
          sparklineData={sessionSparkline}
        />
        <KPICard
          label="Energy (30d kWh)"
          value={kpiTotals.totalEnergy30d.toLocaleString()}
          trend={energyTrend}
          sparklineData={energySparkline}
        />
        <KPICard
          label="Est. CO2 Offset (lbs)"
          value={kpiTotals.co2Offset30d.toLocaleString()}
        />
        <KPICard
          label="Network Uptime"
          value={`${kpiTotals.networkUptime}%`}
          trend={{ direction: 'up', value: 'Above target' }}
        />
        <KPICard
          label="Est. Cost (30d)"
          value={`$${kpiTotals.totalCost30d.toLocaleString()}`}
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
