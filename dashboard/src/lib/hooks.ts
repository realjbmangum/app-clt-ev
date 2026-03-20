import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { mockStations, mockSessions, mockStats } from './mock-data'
import type { Station, Session, StatsResponse } from './mock-data'

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
      const data = await api.get<Station[]>(`/api/stations${qs ? `?${qs}` : ''}`)
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
    api.get<StatsResponse>('/api/stats')
      .then(setStats)
      .catch(() => {
        setStats(mockStats)
        setError(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading, error }
}
