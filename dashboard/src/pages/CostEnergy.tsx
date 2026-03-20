import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import DateRangePicker, { type RangeKey, useFilteredData } from '../components/DateRangePicker'
import { useStats, useEnergyStats } from '../lib/hooks'
import {
  dailyEnergy,
  weeklyEnergy,
  monthlyEnergy,
  costBreakdown,
  kpiTotals,
} from '../lib/mock-analytics'

type Granularity = 'daily' | 'weekly' | 'monthly'

const breakdownColumns = [
  { key: 'location', label: 'Location', sortable: true },
  { key: 'orgUnit', label: 'Org Unit', sortable: true },
  { key: 'totalKWh', label: 'Total kWh', sortable: true, render: (row: Record<string, unknown>) => Number(row.totalKWh).toLocaleString() },
  { key: 'totalCost', label: 'Total Cost', sortable: true, render: (row: Record<string, unknown>) => `$${Number(row.totalCost).toLocaleString()}` },
  { key: 'sessions', label: 'Sessions', sortable: true, render: (row: Record<string, unknown>) => Number(row.sessions).toLocaleString() },
  { key: 'avgCostPerSession', label: 'Avg Cost/Session', sortable: true, render: (row: Record<string, unknown>) => `$${row.avgCostPerSession}` },
]

export default function CostEnergy() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const { stats } = useStats()
  const { data: energyApiData } = useEnergyStats(range)

  // Use API energy data for charts if available, otherwise mock
  const hasApiEnergy = energyApiData?.timeline && energyApiData.timeline.length > 0
  const apiDailyEnergy = useMemo(() => {
    if (!hasApiEnergy) return null
    return energyApiData!.timeline.map(d => ({ date: d.date, kWh: d.kwh, cost: d.cost }))
  }, [hasApiEnergy, energyApiData])

  const filteredDaily = useFilteredData(apiDailyEnergy ?? dailyEnergy, range)

  const energyData = useMemo(() => {
    if (granularity === 'weekly') return hasApiEnergy ? filteredDaily : weeklyEnergy
    if (granularity === 'monthly') return hasApiEnergy ? filteredDaily : monthlyEnergy
    return filteredDaily
  }, [filteredDaily, granularity, hasApiEnergy])

  // KPI values: prefer real API stats, fall back to computed mock
  const totalKWh = stats?.total_kwh ?? useMemo(() => energyData.reduce((s, d) => s + d.kWh, 0), [energyData])
  const totalCost = stats?.total_cost ?? useMemo(() => +energyData.reduce((s, d) => s + d.cost, 0).toFixed(2), [energyData])
  const hasSessionData = stats ? stats.total_sessions > 0 : true

  const sparkKWh = (apiDailyEnergy ?? dailyEnergy).slice(-14).map((d) => ({ value: d.kWh }))
  const sparkCost = (apiDailyEnergy ?? dailyEnergy).slice(-14).map((d) => ({ value: d.cost }))

  // Cost breakdown: use API by_org data if available, otherwise mock
  const breakdownData = useMemo(() => {
    if (energyApiData?.by_org && energyApiData.by_org.length > 0) {
      return energyApiData.by_org.map(o => ({
        location: o.org_name,
        orgUnit: o.org_name,
        totalKWh: o.total_kwh,
        totalCost: +o.total_cost.toFixed(2),
        sessions: o.session_count,
        avgCostPerSession: o.session_count > 0 ? +(o.total_cost / o.session_count).toFixed(2) : 0,
      }))
    }
    return costBreakdown
  }, [energyApiData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-charlotte-black">Cost & Energy</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* No session data banner */}
      {!hasSessionData && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          Session data will populate once ChargePoint sync begins. Showing real station counts with zero session/energy values.
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total kWh Consumed"
          value={totalKWh.toLocaleString()}
          trend={hasSessionData ? {
            direction: totalKWh > kpiTotals.prevPeriodEnergy30d ? 'up' : 'down',
            value: `${Math.abs(((totalKWh - kpiTotals.prevPeriodEnergy30d) / kpiTotals.prevPeriodEnergy30d) * 100).toFixed(1)}% vs prev`,
          } : undefined}
          sparklineData={hasSessionData ? sparkKWh : undefined}
        />
        <KPICard
          label="Total Estimated Cost"
          value={`$${totalCost.toLocaleString()}`}
          trend={hasSessionData ? {
            direction: totalCost > kpiTotals.totalCost30d * 0.9 ? 'up' : 'down',
            value: 'vs prev period',
          } : undefined}
          sparklineData={hasSessionData ? sparkCost : undefined}
        />
        <KPICard
          label="Cost per kWh (Avg)"
          value={totalKWh > 0 ? `$${(totalCost / totalKWh).toFixed(2)}` : '$0.00'}
        />
        <KPICard
          label="Cost per Session (Avg)"
          value={stats && stats.total_sessions > 0 ? `$${(totalCost / stats.total_sessions).toFixed(2)}` : '$0.00'}
        />
      </div>

      {/* Energy chart */}
      <ChartCard title={`Energy Consumption (kWh)${!hasSessionData ? ' — Sample Data' : ''}`}>
        <div className="flex gap-1 mb-4">
          {(['daily', 'weekly', 'monthly'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                granularity === g
                  ? 'bg-charlotte-green-dark text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="kWh"
                stroke="#24824A"
                strokeWidth={2}
                dot={false}
                name="kWh"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Cost trend chart */}
      <ChartCard title={`Cost Trend ($)${!hasSessionData ? ' — Sample Data' : ''}`}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#2F70B8"
                strokeWidth={2}
                dot={false}
                name="Est. Cost"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Breakdown table */}
      <ChartCard title="Cost Breakdown by Location">
        <DataTable
          columns={breakdownColumns}
          data={breakdownData as unknown as Record<string, unknown>[]}
        />
      </ChartCard>
    </div>
  )
}
