import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import DateRangePicker, { type RangeKey } from '../components/DateRangePicker'
import EmptyState from '../components/EmptyState'
import { useStats, useEnergyStats } from '../lib/hooks'
import { Download, Zap, X } from 'lucide-react'

export default function CostEnergy() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [showDukeModal, setShowDukeModal] = useState(false)

  const { stats } = useStats()
  const { data: energyData } = useEnergyStats(range)

  const totalKwh = stats?.total_kwh ?? 0
  const totalCost = stats?.total_cost ?? 0
  const totalSessions = stats?.total_sessions ?? 0
  const costPerKwh = totalKwh > 0 ? (totalCost / totalKwh).toFixed(3) : '0.000'

  const timeline = energyData?.timeline ?? []
  const byOrg = energyData?.by_org ?? []

  const dukeRates = [
    { name: 'ChargePoint Avg', rate: totalKwh > 0 ? +(totalCost / totalKwh).toFixed(4) : 0 },
    { name: 'Duke Residential', rate: 0.1189 },
    { name: 'Duke Commercial', rate: 0.0891 },
  ]

  function handleExport() {
    if (byOrg.length === 0) return
    const header = 'Org Unit,Total kWh,Total Cost,Sessions'
    const rows = byOrg.map(r =>
      [r.org_name, r.total_kwh, r.total_cost, r.session_count]
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDukeModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Compare Duke Energy Rates
          </button>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total kWh Consumed</p>
          <p className="text-2xl font-bold text-charlotte-black">{totalKwh.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Estimated Cost</p>
          <p className="text-2xl font-bold text-charlotte-black">${totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cost per kWh (Avg)</p>
          <p className="text-2xl font-bold text-charlotte-black">${costPerKwh}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Sessions</p>
          <p className="text-2xl font-bold text-charlotte-black">{totalSessions.toLocaleString()}</p>
        </div>
      </div>

      {/* Energy chart */}
      <ChartCard title="Energy Consumption (kWh)">
        {timeline.length > 0 ? (
          <div className="min-h-[200px]" style={{ width: '100%', height: 288 }}>
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="kwh" stroke="#24824A" strokeWidth={2} dot={false} name="kWh" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No energy data available yet" />
        )}
      </ChartCard>

      {/* Cost trend chart */}
      <ChartCard title="Cost Trend ($)">
        {timeline.length > 0 ? (
          <div className="min-h-[200px]" style={{ width: '100%', height: 288 }}>
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="cost" stroke="#2F70B8" strokeWidth={2} dot={false} name="Est. Cost" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No cost data available yet" />
        )}
      </ChartCard>

      {/* Breakdown table */}
      <ChartCard title="Cost Breakdown by Org Unit">
        {byOrg.length > 0 ? (
          <>
            <div className="flex justify-end mb-3">
              <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-charlotte-green-dark">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Org Unit</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Total kWh</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Total Cost</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {byOrg.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charlotte-black">{row.org_name}</td>
                      <td className="px-4 py-3 text-right">{Number(row.total_kwh).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${Number(row.total_cost).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{Number(row.session_count).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title="No cost data available yet" />
        )}
      </ChartCard>

      {/* Duke Energy Rate Comparison Modal */}
      {showDukeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-charlotte-black">Rate Comparison</h2>
              <button onClick={() => setShowDukeModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Rate table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Provider</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Rate ($/kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {dukeRates.map((r) => (
                    <tr key={r.name} className="border-b border-gray-50">
                      <td className="px-3 py-3 font-medium text-charlotte-black">{r.name}</td>
                      <td className="px-3 py-3 text-right font-mono">${r.rate.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Horizontal bar chart */}
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={dukeRates} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} domain={[0, 'auto']} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(4)}/kWh`} />
                    <Bar dataKey="rate" fill="#24824A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Full Duke Energy rate schedule integration planned for Phase 2
              </p>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowDukeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
