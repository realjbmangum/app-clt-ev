import { useState } from 'react'
import { UserPlus, CheckCircle, XCircle, Edit2, ChevronUp, ChevronDown } from 'lucide-react'
import { mockUsers, mockSyncLogs } from '../lib/mock-analytics'

type Tab = 'users' | 'sync'
type SortDir = 'asc' | 'desc'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')
  const [showAddUser, setShowAddUser] = useState(false)
  const [users, setUsers] = useState(mockUsers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Viewer', password: '' })

  function handleAddUser() {
    if (!newUser.name || !newUser.email) return
    setUsers([
      ...users,
      {
        id: String(Date.now()),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'Active' as const,
        lastLogin: new Date().toISOString(),
      },
    ])
    setNewUser({ name: '', email: '', role: 'Viewer', password: '' })
    setShowAddUser(false)
  }

  function toggleUserStatus(id: string) {
    setUsers(users.map((u) =>
      u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' as const : 'Active' as const } : u
    ))
  }

  function changeRole(id: string, role: string) {
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)))
    setEditingId(null)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const syncTypes = ['Station Status', 'Session Data', 'Energy Aggregation']
  const lastSyncs = syncTypes.map((type) => {
    const latest = mockSyncLogs.find((l) => l.type === type)
    return { type, ...latest }
  })

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-charlotte-black">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: 'users' as Tab, label: 'Users' },
          { key: 'sync' as Tab, label: 'Sync Health' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-charlotte-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="space-y-4">
          {showAddUser ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-charlotte-black">Add New User</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                >
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Viewer</option>
                </select>
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-charlotte-green-dark rounded-lg hover:bg-charlotte-green-dark/90"
                >
                  Add User
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-charlotte-green-dark rounded-lg hover:bg-charlotte-green-dark/90"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'role', label: 'Role' },
                      { key: 'status', label: 'Status' },
                      { key: 'lastLogin', label: 'Last Login' },
                    ].map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-charlotte-black">
                        <div className="flex items-center gap-1">{col.label} <SortIcon col={col.key} /></div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charlotte-black">{user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        {editingId === user.id ? (
                          <select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option>Admin</option>
                            <option>Manager</option>
                            <option>Viewer</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(user.lastLogin).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingId(user.id)}
                            className="p-1 text-gray-400 hover:text-charlotte-blue rounded"
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={`p-1 rounded ${
                              user.status === 'Active' ? 'text-gray-400 hover:text-charlotte-red' : 'text-gray-400 hover:text-charlotte-green-dark'
                            }`}
                            title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            {user.status === 'Active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'sync' && (
        <div className="space-y-6">
          {/* Sync status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {lastSyncs.map((sync) => (
              <div key={sync.type} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    sync.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <h3 className="text-sm font-semibold text-charlotte-black">{sync.type}</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Last sync:{' '}
                  {sync.timestamp
                    ? new Date(sync.timestamp).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : 'Never'}
                </p>
                {sync.status === 'success' && (
                  <p className="text-xs text-gray-400 mt-1">{sync.recordsProcessed} records processed</p>
                )}
                {sync.status === 'error' && sync.error && (
                  <p className="text-xs text-charlotte-red mt-1">{sync.error}</p>
                )}
              </div>
            ))}
          </div>

          {/* Sync logs table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-charlotte-black">Recent Sync Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Records Processed</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Error</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSyncLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-charlotte-black">{log.type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.recordsProcessed}</td>
                      <td className="px-4 py-3">
                        {log.error ? <span className="text-charlotte-red text-xs">{log.error}</span> : <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
