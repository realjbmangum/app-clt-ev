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

  const filteredDaily = useFilteredData(dailyEnergy, range)

  const energyData = useMemo(() => {
    if (granularity === 'weekly') return weeklyEnergy
    if (granularity === 'monthly') return monthlyEnergy
    return filteredDaily
  }, [filteredDaily, granularity])

  const totalKWh = useMemo(() => energyData.reduce((s, d) => s + d.kWh, 0), [energyData])
  const totalCost = useMemo(() => +energyData.reduce((s, d) => s + d.cost, 0).toFixed(2), [energyData])

  const sparkKWh = dailyEnergy.slice(-14).map((d) => ({ value: d.kWh }))
  const sparkCost = dailyEnergy.slice(-14).map((d) => ({ value: d.cost }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-charlotte-black">Cost & Energy</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total kWh Consumed"
          value={totalKWh.toLocaleString()}
          trend={{
            direction: totalKWh > kpiTotals.prevPeriodEnergy30d ? 'up' : 'down',
            value: `${Math.abs(((totalKWh - kpiTotals.prevPeriodEnergy30d) / kpiTotals.prevPeriodEnergy30d) * 100).toFixed(1)}% vs prev`,
          }}
          sparklineData={sparkKWh}
        />
        <KPICard
          label="Total Estimated Cost"
          value={`$${totalCost.toLocaleString()}`}
          trend={{
            direction: totalCost > kpiTotals.totalCost30d * 0.9 ? 'up' : 'down',
            value: 'vs prev period',
          }}
          sparklineData={sparkCost}
        />
        <KPICard
          label="Cost per kWh (Avg)"
          value={`$${kpiTotals.avgCostPerKWh}`}
        />
        <KPICard
          label="Cost per Session (Avg)"
          value={`$${kpiTotals.avgCostPerSession30d}`}
        />
      </div>

      {/* Energy chart */}
      <ChartCard title="Energy Consumption (kWh)">
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
      <ChartCard title="Cost Trend ($)">
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
          data={costBreakdown as unknown as Record<string, unknown>[]}
        />
      </ChartCard>
    </div>
  )
}
