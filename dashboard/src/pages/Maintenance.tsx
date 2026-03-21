import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { AlertTriangle, Clock, CheckCircle2, Wrench, Plus, X } from 'lucide-react'
import { useStations } from '../lib/hooks'

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

const ISSUE_TYPE_STYLES: Record<string, string> = {
  FAULTED: 'bg-red-100 text-red-800',
  UNREACHABLE: 'bg-orange-100 text-orange-800',
  DAMAGED: 'bg-rose-100 text-rose-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  OTHER: 'bg-gray-100 text-gray-800',
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
}

export default function Maintenance() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [issueTypeFilter, setIssueTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ station_charger_id: '', station_name: '', issue_type: 'FAULTED', description: '', assigned_to: '' })
  const [stationSearch, setStationSearch] = useState('')

  const { stations } = useStations()

  const filteredStations = useMemo(() => {
    if (!stationSearch) return []
    const q = stationSearch.toLowerCase()
    return stations.filter(s =>
      s.evse_name?.toLowerCase().includes(q) || s.charger_id?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [stations, stationSearch])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (issueTypeFilter) params.set('issue_type', issueTypeFilter)
      const qs = params.toString()
      const data = await api.get<{ logs: MaintenanceLog[] }>(`/api/maintenance${qs ? `?${qs}` : ''}`)
      setLogs(data.logs || [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [statusFilter, issueTypeFilter])

  const openCount = logs.filter(l => l.status === 'open').length
  const inProgressCount = logs.filter(l => l.status === 'in_progress').length
  const resolvedCount = logs.filter(l => l.status === 'resolved').length

  const resolvedLogs = logs.filter(l => l.status === 'resolved' && l.reported_at && l.resolved_at)
  const avgResolutionHours = resolvedLogs.length > 0
    ? Math.round(resolvedLogs.reduce((sum, l) => {
        const diff = new Date(l.resolved_at!).getTime() - new Date(l.reported_at).getTime()
        return sum + diff / (1000 * 60 * 60)
      }, 0) / resolvedLogs.length)
    : 0

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
      // Add to local state as fallback
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
            <span className="text-xs text-gray-500">Open Issues</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{openCount}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">In Progress</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{inProgressCount}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Avg Resolution Time</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{avgResolutionHours}h</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Resolved</span>
          </div>
          <span className="text-2xl font-semibold text-charlotte-black">{resolvedCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={issueTypeFilter}
          onChange={e => setIssueTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All Issue Types</option>
          <option value="FAULTED">Faulted</option>
          <option value="UNREACHABLE">Unreachable</option>
          <option value="DAMAGED">Damaged</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading maintenance logs...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-800'}`}>
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
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No maintenance logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
