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
import DateRangePicker, { type RangeKey, useFilteredData } from '../components/DateRangePicker'
import { useStats } from '../lib/hooks'
import {
  dailyEnergy,
  weeklyEnergy,
  monthlyEnergy,
  costBreakdown,
} from '../lib/mock-analytics'
import { Download } from 'lucide-react'

type Granularity = 'daily' | 'weekly' | 'monthly'

export default function CostEnergy() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const { stats } = useStats()

  const totalKwh = stats?.total_kwh ?? 0
  const totalCost = stats?.total_cost ?? 0
  const totalSessions = stats?.total_sessions ?? 0

  const filteredDaily = useFilteredData(dailyEnergy, range)

  const energyData = useMemo(() => {
    if (granularity === 'weekly') return weeklyEnergy
    if (granularity === 'monthly') return monthlyEnergy
    return filteredDaily
  }, [filteredDaily, granularity])

  const periodKwh = useMemo(() => energyData.reduce((s, d) => s + d.kWh, 0), [energyData])
  const periodCost = useMemo(() => +energyData.reduce((s, d) => s + d.cost, 0).toFixed(2), [energyData])

  function handleExport() {
    const header = 'Location,Org Unit,Total kWh,Total Cost,Sessions,Avg Cost/Session'
    const rows = costBreakdown.map(r =>
      [r.location, r.orgUnit, r.totalKWh, r.totalCost, r.sessions, r.avgCostPerSession]
        .map(v => `"${v}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clt-ev-cost-breakdown.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-charlotte-black">Cost & Energy</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total kWh Consumed</p>
          <p className="text-2xl font-bold text-charlotte-black">{(totalKwh || periodKwh).toLocaleString()}</p>
          {totalKwh === 0 && <p className="text-xs text-gray-400 mt-1">Sample data shown</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Estimated Cost</p>
          <p className="text-2xl font-bold text-charlotte-black">${(totalCost || periodCost).toLocaleString()}</p>
          {totalCost === 0 && <p className="text-xs text-gray-400 mt-1">Sample data shown</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cost per kWh (Avg)</p>
          <p className="text-2xl font-bold text-charlotte-black">
            ${periodKwh > 0 ? (periodCost / periodKwh).toFixed(3) : '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Sessions</p>
          <p className="text-2xl font-bold text-charlotte-black">{totalSessions.toLocaleString()}</p>
          {totalSessions === 0 && <p className="text-xs text-gray-400 mt-1">Awaiting sync</p>}
        </div>
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
              <Line type="monotone" dataKey="kWh" stroke="#24824A" strokeWidth={2} dot={false} name="kWh" />
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
              <Line type="monotone" dataKey="cost" stroke="#2F70B8" strokeWidth={2} dot={false} name="Est. Cost" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Breakdown table */}
      <ChartCard title="Cost Breakdown by Location">
        <div className="flex justify-end mb-3">
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-charlotte-green-dark">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Org Unit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Total kWh</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Total Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Sessions</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Avg Cost/Session</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdown.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-charlotte-black">{row.location}</td>
                  <td className="px-4 py-3 text-gray-600">{row.orgUnit}</td>
                  <td className="px-4 py-3 text-right">{Number(row.totalKWh).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">${Number(row.totalCost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{Number(row.sessions).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">${row.avgCostPerSession}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
