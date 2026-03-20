// Mock analytics data for CLT EV Dashboard

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function rand(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min))
}

// 90 days of daily session data
export const dailySessions = Array.from({ length: 90 }, (_, i) => {
  const dayOfWeek = new Date(Date.now() - (89 - i) * 86400000).getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const base = isWeekend ? 55 : 110
  return {
    date: dateStr(89 - i),
    sessions: rand(base - 25, base + 25),
  }
})

// 90 days of daily energy (kWh) data
export const dailyEnergy = Array.from({ length: 90 }, (_, i) => {
  const dayOfWeek = new Date(Date.now() - (89 - i) * 86400000).getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const base = isWeekend ? 600 : 1400
  return {
    date: dateStr(89 - i),
    kWh: rand(base - 300, base + 300),
    cost: +(rand(base - 300, base + 300) * 0.12).toFixed(2),
  }
})

// Weekly aggregations
export const weeklySessions = (() => {
  const weeks: { date: string; sessions: number }[] = []
  for (let i = 0; i < dailySessions.length; i += 7) {
    const chunk = dailySessions.slice(i, i + 7)
    weeks.push({
      date: chunk[0].date,
      sessions: chunk.reduce((s, d) => s + d.sessions, 0),
    })
  }
  return weeks
})()

export const weeklyEnergy = (() => {
  const weeks: { date: string; kWh: number; cost: number }[] = []
  for (let i = 0; i < dailyEnergy.length; i += 7) {
    const chunk = dailyEnergy.slice(i, i + 7)
    weeks.push({
      date: chunk[0].date,
      kWh: chunk.reduce((s, d) => s + d.kWh, 0),
      cost: +chunk.reduce((s, d) => s + d.cost, 0).toFixed(2),
    })
  }
  return weeks
})()

// Monthly aggregations
export const monthlySessions = (() => {
  const map = new Map<string, number>()
  dailySessions.forEach((d) => {
    const month = d.date.slice(0, 7)
    map.set(month, (map.get(month) || 0) + d.sessions)
  })
  return Array.from(map, ([date, sessions]) => ({ date, sessions }))
})()

export const monthlyEnergy = (() => {
  const map = new Map<string, { kWh: number; cost: number }>()
  dailyEnergy.forEach((d) => {
    const month = d.date.slice(0, 7)
    const prev = map.get(month) || { kWh: 0, cost: 0 }
    map.set(month, { kWh: prev.kWh + d.kWh, cost: +(prev.cost + d.cost).toFixed(2) })
  })
  return Array.from(map, ([date, v]) => ({ date, ...v }))
})()

// Station rankings
const stationNames = [
  'Uptown Transit Center', 'Charlotte Gateway', 'South End Hub', 'NoDa Station',
  'Plaza Midwood Lot', 'Dilworth Park', 'University City', 'Ballantyne Commons',
  'Northlake Mall', 'Freedom Park', 'Eastland Mall', 'Airport Terminal A',
  'Airport Terminal B', 'Airport Economy Lot', 'Water Treatment Plant',
  'McAlpine Creek', 'Reedy Creek', 'City Hall Garage', 'Spectrum Center',
  'Panthers Stadium', 'Independence Blvd', 'Brookshire Freeway',
  'Sugar Creek Station', 'Arrowood Station', 'Tyvola Station',
  'Archdale Station', 'Woodlawn Station', 'Scaleybark Station',
  'New Bern Station', 'Old Concord Rd',
]

export const stationRankings = stationNames
  .map((name) => ({ name, sessions: rand(30, 500) }))
  .sort((a, b) => b.sessions - a.sessions)

// Usage heatmap: hour (0-23) x day (0=Mon..6=Sun)
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const usageHeatmap = dayLabels.flatMap((day, dayIdx) =>
  Array.from({ length: 24 }, (_, hour) => {
    const isWeekend = dayIdx >= 5
    const isPeak = hour >= 8 && hour <= 18
    const base = isWeekend ? (isPeak ? 3 : 1) : isPeak ? 8 : 2
    return { day, hour, sessions: rand(Math.max(0, base - 2), base + 3) }
  })
)

// Average session duration trend (minutes)
export const avgSessionDuration = Array.from({ length: 90 }, (_, i) => ({
  date: dateStr(89 - i),
  minutes: rand(25, 65),
}))

// Cost breakdown by location/org unit
const orgUnits = ['City of Charlotte', 'CLT Airport', 'Water Services']
const orgLocations: Record<string, string[]> = {
  'City of Charlotte': [
    'Uptown Transit Center', 'South End Hub', 'NoDa Station', 'Plaza Midwood Lot',
    'Dilworth Park', 'University City', 'City Hall Garage', 'Spectrum Center',
  ],
  'CLT Airport': ['Terminal A', 'Terminal B', 'Economy Lot', 'Rental Car Center'],
  'Water Services': ['McAlpine Creek', 'Reedy Creek', 'Water Treatment Plant'],
}

export const costBreakdown = orgUnits.flatMap((orgUnit) =>
  orgLocations[orgUnit].map((location) => {
    const totalKWh = rand(800, 8000)
    const sessions = rand(40, 400)
    return {
      location,
      orgUnit,
      totalKWh,
      totalCost: +(totalKWh * 0.12).toFixed(2),
      sessions,
      avgCostPerSession: +((totalKWh * 0.12) / sessions).toFixed(2),
    }
  })
)

// Monthly summary for executive MoM table
export const monthlySummary = (() => {
  const months: {
    month: string
    sessions: number
    kWh: number
    cost: number
    avgDuration: number
    uptime: number
    sessionChange?: number
    kWhChange?: number
    costChange?: number
  }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const sessions = rand(2200, 3800)
    const kWh = rand(28000, 48000)
    const cost = +(kWh * 0.12).toFixed(2)
    months.push({
      month: d.toISOString().slice(0, 7),
      sessions,
      kWh,
      cost,
      avgDuration: rand(30, 50),
      uptime: +(96 + Math.random() * 4).toFixed(1),
    })
  }

  for (let i = 1; i < months.length; i++) {
    months[i].sessionChange = +(
      ((months[i].sessions - months[i - 1].sessions) / months[i - 1].sessions) *
      100
    ).toFixed(1)
    months[i].kWhChange = +(
      ((months[i].kWh - months[i - 1].kWh) / months[i - 1].kWh) *
      100
    ).toFixed(1)
    months[i].costChange = +(
      ((months[i].cost - months[i - 1].cost) / months[i - 1].cost) *
      100
    ).toFixed(1)
  }

  return months
})()

// Org unit station distribution
export const stationDistribution = [
  { name: 'City of Charlotte', value: 178, color: '#24824A' },
  { name: 'CLT Airport', value: 20, color: '#2F70B8' },
  { name: 'Water Services', value: 10, color: '#0A7D8C' },
]

export const publicPrivateDistribution = [
  { name: 'Public', value: 77, color: '#71BF44' },
  { name: 'Private', value: 131, color: '#0C1C35' },
]

// Mock users for admin
export const mockUsers = [
  { id: '1', name: 'Sarah Chen', email: 'schen@charlottenc.gov', role: 'Admin', status: 'Active' as const, lastLogin: '2026-03-19T14:30:00Z' },
  { id: '2', name: 'Marcus Williams', email: 'mwilliams@charlottenc.gov', role: 'Manager', status: 'Active' as const, lastLogin: '2026-03-20T09:15:00Z' },
  { id: '3', name: 'Jessica Patel', email: 'jpatel@cltairport.org', role: 'Viewer', status: 'Active' as const, lastLogin: '2026-03-18T16:45:00Z' },
  { id: '4', name: 'David Kim', email: 'dkim@charlottenc.gov', role: 'Manager', status: 'Inactive' as const, lastLogin: '2026-02-10T11:00:00Z' },
  { id: '5', name: 'Amanda Torres', email: 'atorres@charlottenc.gov', role: 'Viewer', status: 'Active' as const, lastLogin: '2026-03-20T08:00:00Z' },
]

// Mock sync logs for admin
export const mockSyncLogs = Array.from({ length: 20 }, (_, i) => {
  const types = ['Station Status', 'Session Data', 'Energy Aggregation']
  const type = types[i % 3]
  const success = Math.random() > 0.1
  const d = new Date()
  d.setHours(d.getHours() - i * 2)
  return {
    id: `sync-${20 - i}`,
    type,
    status: success ? ('success' as const) : ('error' as const),
    recordsProcessed: success ? rand(50, 500) : 0,
    error: success ? null : 'Connection timeout after 30s',
    timestamp: d.toISOString(),
  }
})

// KPI totals helper
export const kpiTotals = {
  totalStations: 208,
  totalSessions30d: dailySessions.slice(-30).reduce((s, d) => s + d.sessions, 0),
  totalSessions90d: dailySessions.reduce((s, d) => s + d.sessions, 0),
  totalEnergy30d: dailyEnergy.slice(-30).reduce((s, d) => s + d.kWh, 0),
  totalEnergy90d: dailyEnergy.reduce((s, d) => s + d.kWh, 0),
  totalCost30d: +dailyEnergy.slice(-30).reduce((s, d) => s + d.cost, 0).toFixed(2),
  totalCost90d: +dailyEnergy.reduce((s, d) => s + d.cost, 0).toFixed(2),
  avgCostPerKWh: 0.12,
  get avgCostPerSession30d() {
    return +(this.totalCost30d / this.totalSessions30d).toFixed(2)
  },
  get co2Offset30d() {
    return +(this.totalEnergy30d * 0.709).toFixed(0)
  },
  get co2Offset90d() {
    return +(this.totalEnergy90d * 0.709).toFixed(0)
  },
  networkUptime: 98.4,
  prevPeriodSessions30d: dailySessions.slice(-60, -30).reduce((s, d) => s + d.sessions, 0),
  prevPeriodEnergy30d: dailyEnergy.slice(-60, -30).reduce((s, d) => s + d.kWh, 0),
}
