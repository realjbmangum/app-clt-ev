import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  MapPin,
  List,
  BarChart3,
  DollarSign,
  PieChart,
  Users,
  Activity,
  LogOut,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Operations',
    roles: ['operations', 'admin'] as const,
    items: [
      { to: '/map', label: 'Map', icon: MapPin },
      { to: '/stations', label: 'Stations', icon: List },
      { to: '/utilization', label: 'Utilization', icon: BarChart3 },
    ],
  },
  {
    label: 'Finance',
    roles: ['finance', 'admin'] as const,
    items: [
      { to: '/cost', label: 'Cost & Energy', icon: DollarSign },
    ],
  },
  {
    label: 'Leadership',
    roles: ['leadership', 'admin'] as const,
    items: [
      { to: '/executive', label: 'Executive Summary', icon: PieChart },
    ],
  },
  {
    label: 'Admin',
    roles: ['admin'] as const,
    items: [
      { to: '/admin', label: 'Users', icon: Users },
      { to: '/admin/sync', label: 'Sync Health', icon: Activity },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/map': 'Map View',
  '/stations': 'Station List',
  '/utilization': 'Utilization',
  '/cost': 'Cost & Energy',
  '/executive': 'Executive Summary',
  '/admin': 'User Management',
  '/admin/sync': 'Sync Health',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-charlotte-blue',
  operations: 'bg-charlotte-green-light',
  finance: 'bg-charlotte-orange',
  leadership: 'bg-charlotte-purple',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard'

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-charlotte-green-dark flex flex-col">
        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/crown-white.png" alt="Charlotte Crown" className="w-10 h-10" />
            <div>
              <span className="text-white text-lg font-bold tracking-wide">CLT EV</span>
              <p className="text-white/50 text-[10px] leading-tight">City of Charlotte</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS.map((section) => {
            if (!user || !(section.roles as readonly string[]).includes(user.role)) {
              return null
            }
            return (
              <div key={section.label}>
                <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {section.label}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-charlotte-green-light/20 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* User info */}
        {user && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full text-white ${ROLE_COLORS[user.role] || 'bg-white/20'}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-8">
          <div>
            <h1 className="text-lg font-semibold text-charlotte-black">{pageTitle}</h1>
            <p className="text-xs text-gray-400">CLT EV Charging Analytics</p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
