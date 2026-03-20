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
import { useStats } from '../lib/hooks'
import { dailySessions } from '../lib/mock-analytics'

const MONTHLY_GROWTH_RATE = 0.042
const CAPACITY_SESSIONS = 5000

const UTILIZATION_BANDS = [
  { band: '0-25%', stations: 90, fill: '#A7D88C' },
  { band: '25-50%', stations: 65, fill: '#71BF44' },
  { band: '50-75%', stations: 38, fill: '#24824A' },
  { band: '75-100%', stations: 15, fill: '#0C5C2A' },
]

const EXPANSION_ROWS = [
  { area: 'Uptown / Center City', stations: 45, utilization: 72, recommendation: 'Monitor — approaching capacity' },
  { area: 'South End / Dilworth', stations: 32, utilization: 68, recommendation: 'Plan expansion — high growth area' },
  { area: 'University City / NoDa', stations: 28, utilization: 45, recommendation: 'Adequate for current demand' },
  { area: 'Airport', stations: 20, utilization: 55, recommendation: 'Consider adding DC fast chargers' },
  { area: 'Huntersville / North', stations: 12, utilization: 38, recommendation: 'Adequate — low priority' },
]

export default function Forecast() {
  const { stats } = useStats()

  const currentUtilization = useMemo(() => {
    if (!stats) return 0
    return +((stats.occupied / stats.total) * 100).toFixed(1)
  }, [stats])

  const monthsTo80 = useMemo(() => {
    if (currentUtilization >= 80) return 0
    // months = ln(target/current) / ln(1 + growth)
    const target = 80
    const months = Math.ceil(
      Math.log(target / Math.max(currentUtilization, 0.1)) / Math.log(1 + MONTHLY_GROWTH_RATE)
    )
    return months
  }, [currentUtilization])

  // Calculate current avg monthly sessions from last 30 days of mock data
  const currentMonthlySessions = useMemo(() => {
    const last30 = dailySessions.slice(-30)
    return Math.round(last30.reduce((s, d) => s + d.sessions, 0))
  }, [])

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
          label="Stations Needing Expansion"
          value={15}
          trend={{ direction: 'up', value: '>75% utilization' }}
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

        {/* Utilization Bands */}
        <ChartCard title="Stations by Utilization Band" subtitle="Distribution across 208 stations">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={UTILIZATION_BANDS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="stations" name="Stations" radius={[4, 4, 0, 0]}>
                  {UTILIZATION_BANDS.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Expansion Recommendations Table */}
      <ChartCard title="Expansion Recommendations" subtitle="Based on current utilization and growth trends">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Area</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Stations</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Utilization %</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {EXPANSION_ROWS.map((row) => (
                <tr key={row.area} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-charlotte-black">{row.area}</td>
                  <td className="py-3 px-4 text-right">{row.stations}</td>
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
