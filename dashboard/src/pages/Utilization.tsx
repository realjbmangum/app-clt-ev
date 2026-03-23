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
  Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import EmptyState from '../components/EmptyState'
import { useUtilizationStats } from '../lib/hooks'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const HEAT_COLORS = ['#f0fdf4', '#bbf7d0', '#71BF44', '#24824A', '#166534']
function heatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return HEAT_COLORS[0]
  const idx = Math.min(Math.floor((count / max) * (HEAT_COLORS.length - 1)), HEAT_COLORS.length - 1)
  return HEAT_COLORS[idx]
}

export default function Utilization() {
  const { data, loading } = useUtilizationStats()
  const [showTop, setShowTop] = useState(true)

  const sessionTrends = (data?.session_trends || [])
    .map((d: any) => ({ date: d.date, sessions: d.sessions, kwh: d.kwh }))
    .reverse()

  const stationRankings = showTop
    ? (data?.top_stations || []).map((s: any) => ({ name: s.station_name || s.station_charger_id, sessions: s.session_count, id: s.station_charger_id }))
    : (data?.bottom_stations || []).map((s: any) => ({ name: s.station_name || s.station_charger_id, sessions: s.session_count, id: s.station_charger_id }))

  const heatmap = data?.hourly_heatmap || []
  const maxHeat = Math.max(...heatmap.map((h: any) => h.count), 1)

  const hasData = sessionTrends.length > 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-charlotte-black">Utilization</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading utilization data...</div>
      ) : !hasData ? (
        <EmptyState title="No utilization data available yet" description="Session data will populate as ChargePoint sync runs" />
      ) : (
        <>
          {/* Sessions over time */}
          <ChartCard title="Sessions Over Time">
            <div style={{ width: '100%', height: 288 }}>
              <ResponsiveContainer>
                <LineChart data={sessionTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#24824A" strokeWidth={2} dot name="Sessions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Station rankings */}
          <ChartCard title={showTop ? 'Top Stations by Sessions' : 'Bottom Stations by Sessions'}>
            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setShowTop(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  showTop ? 'bg-charlotte-green-dark text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                Top 10
              </button>
              <button
                onClick={() => setShowTop(false)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  !showTop ? 'bg-charlotte-green-dark text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                Bottom 10
              </button>
            </div>
            {stationRankings.length > 0 ? (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={stationRankings} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                      {stationRankings.map((_: any, i: number) => (
                        <Cell key={i} fill={showTop ? '#24824A' : '#EA983E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No station ranking data yet" />
            )}
          </ChartCard>

          {/* Usage Heatmap */}
          <ChartCard title="Usage Heatmap (Sessions by Hour & Day)">
            {heatmap.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex">
                    <div className="w-12" />
                    {HOURS.map(h => (
                      <div key={h} className="flex-1 text-center text-xs text-gray-400">{h}</div>
                    ))}
                  </div>
                  {DAY_LABELS.map((day, dayIdx) => (
                    <div key={day} className="flex items-center">
                      <div className="w-12 text-xs text-gray-500 font-medium">{day}</div>
                      {HOURS.map(hour => {
                        const entry = heatmap.find((h: any) => h.day_of_week === dayIdx && h.hour === hour)
                        const count = entry ? (entry as any).count : 0
                        return (
                          <div
                            key={hour}
                            className="flex-1 aspect-square m-0.5 rounded-sm cursor-default"
                            style={{ backgroundColor: heatColor(count, maxHeat), minHeight: 20 }}
                            title={`${day} ${hour}:00 — ${count} sessions`}
                          />
                        )
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-xs text-gray-400">Less</span>
                    {HEAT_COLORS.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                    <span className="text-xs text-gray-400">More</span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No heatmap data yet" />
            )}
          </ChartCard>

          {/* Energy delivered */}
          <ChartCard title="Energy Delivered (kWh)">
            <div style={{ width: '100%', height: 288 }}>
              <ResponsiveContainer>
                <LineChart data={sessionTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="kwh" stroke="#2F70B8" strokeWidth={2} dot name="kWh" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  )
}
