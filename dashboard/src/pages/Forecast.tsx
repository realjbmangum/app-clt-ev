import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import { useStats, useStations } from '../lib/hooks'

const MONTHLY_GROWTH_RATE = 0.042
const CAPACITY_SESSIONS = 5000

const STATUS_COLORS: Record<string, string> = {
  Available: '#71BF44',
  Occupied: '#2F70B8',
  Unreachable: '#EA983E',
  Faulted: '#DE0505',
}

export default function Forecast() {
  const { stats } = useStats()
  const { stations } = useStations()

  const currentUtilization = useMemo(() => {
    if (!stats) return 0
    return +((stats.occupied / stats.total) * 100).toFixed(1)
  }, [stats])

  const monthsTo80 = useMemo(() => {
    if (currentUtilization >= 80) return 0
    const target = 80
    const months = Math.ceil(
      Math.log(target / Math.max(currentUtilization, 0.1)) / Math.log(1 + MONTHLY_GROWTH_RATE)
    )
    return months
  }, [currentUtilization])

  // Use real session count from API, extrapolate to monthly
  const currentMonthlySessions = useMemo(() => {
    if (!stats || stats.total_sessions === 0) return 55 * 30 // baseline estimate if no data yet
    return Math.round(stats.total_sessions * 15) // rough monthly projection from current data
  }, [stats])

  // Project 12 months forward
  const projectedUsage = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const projected = Math.round(currentMonthlySessions * Math.pow(1 + MONTHLY_GROWTH_RATE, i))
      return { month: label, projected, capacity: CAPACITY_SESSIONS }
    })
  }, [currentMonthlySessions])

  // Station Status Distribution - computed from real stats
  const statusDistribution = useMemo(() => {
    if (!stats) return []
    return [
      { status: 'Available', count: stats.available, fill: STATUS_COLORS.Available },
      { status: 'Occupied', count: stats.occupied, fill: STATUS_COLORS.Occupied },
      { status: 'Unreachable', count: stats.unreachable, fill: STATUS_COLORS.Unreachable },
      { status: 'Faulted', count: stats.faulted, fill: STATUS_COLORS.Faulted },
    ]
  }, [stats])

  // Expansion table: group stations by org_name, compute utilization per group
  const expansionRows = useMemo(() => {
    if (stations.length === 0) return []
    const groups = new Map<string, { total: number; occupied: number }>()
    for (const s of stations) {
      const org = s.org_name?.trim() || 'Unknown'
      const prev = groups.get(org) || { total: 0, occupied: 0 }
      prev.total++
      if (s.station_status === 'OCCUPIED') prev.occupied++
      groups.set(org, prev)
    }
    return Array.from(groups, ([org, g]) => {
      const utilization = g.total > 0 ? Math.round((g.occupied / g.total) * 100) : 0
      let recommendation = 'Adequate for current demand'
      if (utilization >= 70) recommendation = 'Monitor — approaching capacity'
      else if (utilization >= 50) recommendation = 'Plan expansion — high growth area'
      return { area: org, stations: g.total, occupied: g.occupied, utilization, recommendation }
    }).sort((a, b) => b.utilization - a.utilization)
  }, [stations])

  const occupiedCount = stats?.occupied ?? 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Current Network Utilization"
          value={`${currentUtilization}%`}
        />
        <KPICard
          label="Projected Monthly Growth"
          value="4.2%"
          trend={{ direction: 'up', value: 'compound monthly' }}
        />
        <KPICard
          label="Est. Months to 80% Capacity"
          value={monthsTo80}
        />
        <KPICard
          label="Currently Occupied"
          value={occupiedCount}
          trend={{ direction: 'up', value: 'stations in use' }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projected Usage */}
        <ChartCard title="Projected Monthly Sessions" subtitle="12-month forecast at 4.2% compound growth">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectedUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <ReferenceLine
                  y={CAPACITY_SESSIONS}
                  stroke="#9CA3AF"
                  strokeDasharray="6 4"
                  label={{ value: 'Capacity', position: 'right', fontSize: 11, fill: '#9CA3AF' }}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#24824A"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#24824A' }}
                  name="Projected Sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Station Status Distribution */}
        <ChartCard title="Station Status Distribution" subtitle={`Across ${stats?.total ?? 0} stations`}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Stations" radius={[4, 4, 0, 0]}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Expansion Recommendations Table */}
      <ChartCard title="Expansion Recommendations" subtitle="Based on current station utilization by org unit">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Org Unit</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Stations</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Occupied</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Utilization %</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {expansionRows.map((row) => (
                <tr key={row.area} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-charlotte-black">{row.area}</td>
                  <td className="py-3 px-4 text-right">{row.stations}</td>
                  <td className="py-3 px-4 text-right">{row.occupied}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1.5 ${
                      row.utilization >= 70 ? 'text-charlotte-orange' :
                      row.utilization >= 50 ? 'text-charlotte-blue' :
                      'text-charlotte-green-dark'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {row.utilization}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{row.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
