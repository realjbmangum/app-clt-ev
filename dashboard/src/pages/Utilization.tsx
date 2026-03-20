import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import DateRangePicker, { type RangeKey, useFilteredData } from '../components/DateRangePicker'
import FilterPanel from '../components/FilterPanel'
import {
  dailySessions,
  weeklySessions,
  monthlySessions,
  stationRankings,
  usageHeatmap,
  avgSessionDuration,
} from '../lib/mock-analytics'

type Granularity = 'daily' | 'weekly' | 'monthly'

const orgUnitFilters = [
  { key: 'orgUnit', label: 'Org Unit', options: [
    { label: 'City of Charlotte', value: 'city' },
    { label: 'CLT Airport', value: 'airport' },
    { label: 'Water Services', value: 'water' },
  ]},
]

export default function Utilization() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [stationView, setStationView] = useState<'top' | 'bottom'>('top')
  const [filters, setFilters] = useState<Record<string, string>>({})

  const filteredDaily = useFilteredData(dailySessions, range)

  const sessionData = useMemo(() => {
    if (granularity === 'weekly') return weeklySessions
    if (granularity === 'monthly') return monthlySessions
    return filteredDaily
  }, [filteredDaily, granularity])

  const durationData = useFilteredData(avgSessionDuration, range)

  const rankedStations = useMemo(() => {
    const sorted = [...stationRankings]
    if (stationView === 'bottom') sorted.reverse()
    return sorted.slice(0, 20)
  }, [stationView])

  const heatmapMax = useMemo(() => Math.max(...usageHeatmap.map((h) => h.sessions)), [])

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-charlotte-black">Utilization</h1>
        <div className="flex flex-wrap items-center gap-4">
          <FilterPanel
            filters={orgUnitFilters}
            values={filters}
            onChange={(k, v) => setFilters({ ...filters, [k]: v })}
          />
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {/* Sessions over time */}
      <ChartCard title="Sessions Over Time">
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
            <LineChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#24824A"
                strokeWidth={2}
                dot={false}
                name="Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Station rankings */}
      <ChartCard title={`${stationView === 'top' ? 'Top' : 'Bottom'} 20 Stations by Sessions`}>
        <div className="flex gap-1 mb-4">
          {(['top', 'bottom'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setStationView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                stationView === v
                  ? 'bg-charlotte-green-dark text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'top' ? 'Top 20' : 'Bottom 20'}
            </button>
          ))}
        </div>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankedStations} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#24824A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Usage Heatmap */}
      <ChartCard title="Usage Heatmap (Sessions by Hour & Day)">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="flex">
              <div className="w-12 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[10px] text-gray-400 pb-1">
                  {h}
                </div>
              ))}
            </div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="flex items-center">
                <div className="w-12 shrink-0 text-xs text-gray-500 font-medium">{day}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = usageHeatmap.find((h) => h.day === day && h.hour === hour)
                  const intensity = cell ? cell.sessions / heatmapMax : 0
                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square m-0.5 rounded-sm flex items-center justify-center text-[9px]"
                      style={{
                        backgroundColor: `rgba(36, 130, 74, ${0.08 + intensity * 0.85})`,
                        color: intensity > 0.5 ? 'white' : '#666',
                      }}
                      title={`${day} ${hour}:00 - ${cell?.sessions ?? 0} sessions`}
                    >
                      {cell?.sessions ?? 0}
                    </div>
                  )
                })}
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-gray-400">Low</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                  <div
                    key={v}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: `rgba(36, 130, 74, ${v})` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-400">High</span>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Avg Session Duration */}
      <ChartCard title="Average Session Duration (Minutes)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={durationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#71BF44"
                fill="#71BF44"
                fillOpacity={0.2}
                strokeWidth={2}
                name="Avg Duration (min)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
