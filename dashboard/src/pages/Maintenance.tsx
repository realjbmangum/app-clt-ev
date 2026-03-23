import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { useStations, useStats } from '../lib/hooks'
import type { Station } from '../lib/types'
import { AlertTriangle, Clock, CheckCircle2, Wrench, Plus, X, Radio } from 'lucide-react'

type MaintenanceLog = {
  id: number
  station_charger_id: string
  station_name: string | null
  reported_at: string
  resolved_at: string | null
  issue_type: string
  description: string | null
  assigned_to: string | null
  status: string
  notes: string | null
  created_at: string
}

const STATION_STATUS_STYLES: Record<string, string> = {
  FAULTED: 'bg-red-100 text-red-800',
  UNREACHABLE: 'bg-orange-100 text-orange-800',
}

const TICKET_STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
}

const ISSUE_TYPE_STYLES: Record<string, string> = {
  FAULTED: 'bg-red-100 text-red-800',
  UNREACHABLE: 'bg-orange-100 text-orange-800',
  DAMAGED: 'bg-rose-100 text-rose-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  OTHER: 'bg-gray-100 text-gray-800',
}

export default function Maintenance() {
  // Section A: Stations needing attention (live data)
  const { stations: problemStations, loading: stationsLoading } = useStations({ status: ['FAULTED', 'UNREACHABLE'] })
  const { stats } = useStats()

  // Section B: Maintenance tickets
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ station_charger_id: '', station_name: '', issue_type: 'FAULTED', description: '', assigned_to: '' })
  const [stationSearch, setStationSearch] = useState('')

  // For station search in form, fetch all stations
  const { stations: allStations } = useStations()

  const filteredStations = useMemo(() => {
    if (!stationSearch) return []
    const q = stationSearch.toLowerCase()
    return allStations.filter(s =>
      s.evse_name?.toLowerCase().includes(q) || s.charger_id?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [allStations, stationSearch])

  async function fetchLogs() {
    setLogsLoading(true)
    try {
      const data = await api.get<{ logs: MaintenanceLog[]; total: number }>('/api/maintenance')
      setLogs(data.logs || [])
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const openTickets = logs.filter(l => l.status === 'open').length
  const resolvedTickets = logs.filter(l => l.status === 'resolved').length

  function prefillFromStation(station: Station) {
    const issueType = station.station_status === 'FAULTED' ? 'FAULTED' : 'UNREACHABLE'
    setFormData({
      station_charger_id: station.charger_id,
      station_name: station.evse_name || '',
      issue_type: issueType,
      description: '',
      assigned_to: '',
    })
    setStationSearch(station.evse_name || station.charger_id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/api/maintenance', {
        station_charger_id: formData.station_charger_id,
        station_name: formData.station_name || undefined,
        issue_type: formData.issue_type,
        description: formData.description || undefined,
        assigned_to: formData.assigned_to || undefined,
      })
    } catch {
      setLogs(prev => [{
        id: Date.now(),
        ...formData,
        reported_at: new Date().toISOString(),
        resolved_at: null,
        status: 'open',
        notes: null,
        created_at: new Date().toISOString(),
      } as MaintenanceLog, ...prev])
    }
    setShowForm(false)
    setFormData({ station_charger_id: '', station_name: '', issue_type: 'FAULTED', description: '', assigned_to: '' })
    setStationSearch('')
    fetchLogs()
  }

  async function handleStatusChange(id: number, newStatus: string) {
    try {
      await api.put(`/api/maintenance/${id}`, {
        status: newStatus,
        ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
      })
    } catch {
      // Update local state as fallback
    }
    setLogs(prev => prev.map(l => l.id === id ? {
      ...l,
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : l.resolved_at,
    } : l))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charlotte-black">Maintenance</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-charlotte-green-dark text-white text-sm font-medium rounded-lg hover:bg-charlotte-green-dark/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">Faulted</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{stats?.faulted ?? 0}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Unreachable</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{stats?.unreachable ?? 0}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">Open Tickets</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{openTickets}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Resolved Tickets</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{resolvedTickets}</span>
        </div>
      </div>

      {/* Section A: Stations Needing Attention */}
      <div>
        <h2 className="text-base font-semibold text-charlotte-black mb-2">Stations Needing Attention</h2>
        <div className="bg-white rounded-xl border border-gray-200">
          {stationsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading stations...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Station Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Address</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Org Unit</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Last Status Change</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {problemStations.map(station => (
                    <tr key={station.charger_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charlotte-black">{station.evse_name}</td>
                      <td className="px-4 py-3 text-gray-600">{station.station_address}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATION_STATUS_STYLES[station.station_status] || 'bg-gray-100 text-gray-800'}`}>
                          {station.station_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{station.org_name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {station.last_status_change
                          ? new Date(station.last_status_change).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => prefillFromStation(station)}
                          className="text-xs px-3 py-1 bg-charlotte-green-dark text-white rounded hover:bg-charlotte-green-dark/90 transition-colors"
                        >
                          Create Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                  {problemStations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">All stations operational</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section B: Maintenance Tickets */}
      <div>
        <h2 className="text-base font-semibold text-charlotte-black mb-2">Maintenance Tickets</h2>
        <div className="bg-white rounded-xl border border-gray-200">
          {logsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading maintenance tickets...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Station Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Issue Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Assigned To</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Reported</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Resolved</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charlotte-black">
                        {log.station_name || log.station_charger_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ISSUE_TYPE_STYLES[log.issue_type] || ISSUE_TYPE_STYLES.OTHER}`}>
                          {log.issue_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TICKET_STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-800'}`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.assigned_to || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(log.reported_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.resolved_at ? new Date(log.resolved_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.status !== 'resolved' && (
                          <select
                            value={log.status}
                            onChange={e => handleStatusChange(log.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No maintenance tickets yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Issue Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-charlotte-black">Report Issue</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                <input
                  type="text"
                  value={stationSearch}
                  onChange={e => {
                    setStationSearch(e.target.value)
                    setFormData(f => ({ ...f, station_charger_id: '', station_name: '' }))
                  }}
                  placeholder="Search stations..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                />
                {filteredStations.length > 0 && !formData.station_charger_id && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {filteredStations.map(s => (
                      <button
                        key={s.charger_id}
                        type="button"
                        onClick={() => {
                          setFormData(f => ({ ...f, station_charger_id: s.charger_id, station_name: s.evse_name || '' }))
                          setStationSearch(s.evse_name || s.charger_id)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium">{s.evse_name}</span>
                        <span className="text-gray-400 ml-2">#{s.charger_id}</span>
                      </button>
                    ))}
                  </div>
                )}
                {formData.station_charger_id && (
                  <p className="mt-1 text-xs text-green-600">Selected: {formData.station_name} (#{formData.station_charger_id})</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                <select
                  value={formData.issue_type}
                  onChange={e => setFormData(f => ({ ...f, issue_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="FAULTED">Faulted</option>
                  <option value="UNREACHABLE">Unreachable</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                  placeholder="Describe the issue..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <input
                  type="text"
                  value={formData.assigned_to}
                  onChange={e => setFormData(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                  placeholder="Name of assignee"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.station_charger_id}
                  className="px-4 py-2 bg-charlotte-green-dark text-white text-sm font-medium rounded-lg hover:bg-charlotte-green-dark/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
