import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { mockStations, mockSessions, mockStats } from './mock-data'
import type { Station, Session, StatsResponse } from './mock-data'
import { dailyEnergy, costBreakdown } from './mock-analytics'

export type EnergyTimelineEntry = { date: string; kwh: number; cost: number }
export type EnergyByOrg = { org_name: string; total_kwh: number; total_cost: number; session_count: number }
export type EnergyStatsResponse = { timeline: EnergyTimelineEntry[]; by_org: EnergyByOrg[] }

export type UtilizationTopStation = { evse_name: string; session_count: number }
export type UtilizationHourly = { hour: number; day: number; count: number }
export type UtilizationDaily = { date: string; count: number }
export type UtilizationStatsResponse = {
  top_stations: UtilizationTopStation[]
  hourly: UtilizationHourly[]
  daily_sessions: UtilizationDaily[]
}

export type StationFilters = {
  org?: string
  status?: string[]
  is_public?: boolean | null
  power_type?: string
  search?: string
}

export function useStations(filters: StationFilters = {}) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.org && filters.org !== 'All') params.set('org', filters.org)
      if (filters.status?.length) params.set('status', filters.status.join(','))
      if (filters.is_public !== null && filters.is_public !== undefined) params.set('is_public', String(filters.is_public))
      if (filters.power_type) params.set('power_type', filters.power_type)
      if (filters.search) params.set('search', filters.search)

      const qs = params.toString()
      const raw = await api.get<{ stations: Station[] } | Station[]>(`/api/stations${qs ? `?${qs}` : ''}`)
      // API returns { stations: [...] } wrapper; normalize is_public from D1 (1/0) to boolean
      const arr = Array.isArray(raw) ? raw : raw.stations
      const data = arr.map(s => ({ ...s, is_public: Boolean(s.is_public) }))
      setStations(data)
    } catch {
      // Fallback to mock data when API is unavailable
      let filtered = [...mockStations]

      if (filters.org && filters.org !== 'All') {
        filtered = filtered.filter(s => s.org_name === filters.org)
      }
      if (filters.status?.length) {
        filtered = filtered.filter(s => filters.status!.includes(s.station_status))
      }
      if (filters.is_public !== null && filters.is_public !== undefined) {
        filtered = filtered.filter(s => s.is_public === filters.is_public)
      }
      if (filters.power_type) {
        filtered = filtered.filter(s => s.power_type === filters.power_type)
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        filtered = filtered.filter(s =>
          s.evse_name.toLowerCase().includes(q) ||
          s.station_address.toLowerCase().includes(q)
        )
      }

      setStations(filtered)
      setError(null) // Suppress error when mock data is used
    } finally {
      setLoading(false)
    }
  }, [filters.org, filters.status?.join(','), filters.is_public, filters.power_type, filters.search])

  useEffect(() => {
    fetchStations()
  }, [fetchStations])

  return { stations, loading, error, refetch: fetchStations }
}

export function useSessions(stationId?: string, dateRange?: { start: string; end: string }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!stationId) {
      setSessions([])
      return
    }

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ station_id: stationId, limit: '10' })
    if (dateRange?.start) params.set('start', dateRange.start)
    if (dateRange?.end) params.set('end', dateRange.end)

    api.get<Session[]>(`/api/sessions?${params}`)
      .then(setSessions)
      .catch(() => {
        // Fallback to mock sessions filtered by station
        const filtered = mockSessions.filter(s => s.station_charger_id === stationId)
        setSessions(filtered)
        setError(null)
      })
      .finally(() => setLoading(false))
  }, [stationId, dateRange?.start, dateRange?.end])

  return { sessions, loading, error }
}

export function useStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Record<string, unknown>>('/api/stats')
      .then(raw => {
        // API returns { total_stations, status_counts: [{station_status, count}], ... }
        // Transform to flat shape the UI expects
        const statusCounts = (raw.status_counts as Array<{ station_status: string; count: number }>) || []
        const getCount = (s: string) => statusCounts.find(c => c.station_status === s)?.count ?? 0
        const transformed: StatsResponse = {
          total: (raw.total_stations as number) ?? 0,
          available: getCount('AVAILABLE'),
          occupied: getCount('OCCUPIED'),
          unreachable: getCount('UNREACHABLE'),
          faulted: getCount('FAULTED'),
          total_sessions: (raw.total_sessions as number) ?? 0,
          total_kwh: (raw.total_kwh as number) ?? 0,
          total_cost: (raw.total_cost as number) ?? 0,
          uptime_percent: (raw.uptime_percent as number) ?? 0,
        }
        setStats(transformed)
      })
      .catch(() => {
        setStats(mockStats)
        setError(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading, error }
}

export function useEnergyStats(dateRange?: string) {
  const [data, setData] = useState<EnergyStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = dateRange ? `?range=${dateRange}` : ''
    api.get<EnergyStatsResponse>(`/api/stats/energy${params}`)
      .then(setData)
      .catch(() => {
        // Fallback to mock data reshaped to match API format
        const timeline: EnergyTimelineEntry[] = dailyEnergy.map(d => ({
          date: d.date,
          kwh: d.kWh,
          cost: d.cost,
        }))
        const byOrgMap = new Map<string, EnergyByOrg>()
        for (const row of costBreakdown) {
          const existing = byOrgMap.get(row.orgUnit)
          if (existing) {
            existing.total_kwh += row.totalKWh
            existing.total_cost += row.totalCost
            existing.session_count += row.sessions
          } else {
            byOrgMap.set(row.orgUnit, {
              org_name: row.orgUnit,
              total_kwh: row.totalKWh,
              total_cost: row.totalCost,
              session_count: row.sessions,
            })
          }
        }
        setData({ timeline, by_org: Array.from(byOrgMap.values()) })
        setError(null)
      })
      .finally(() => setLoading(false))
  }, [dateRange])

  return { data, loading, error }
}

export function useUtilizationStats(dateRange?: string) {
  const [data, setData] = useState<UtilizationStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = dateRange ? `?range=${dateRange}` : ''
    api.get<UtilizationStatsResponse>(`/api/stats/utilization${params}`)
      .then(setData)
      .catch(() => {
        // No mock fallback for utilization — leave null so pages show real zeros
        setData(null)
        setError(null)
      })
      .finally(() => setLoading(false))
  }, [dateRange])

  return { data, loading, error }
}
