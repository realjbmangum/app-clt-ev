import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  MapPin,
  List,
  BarChart3,
  DollarSign,
  PieChart,
  Users,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Wrench,
  BarChart2,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Operations',
    roles: ['operations', 'admin'] as const,
    items: [
      { to: '/map', label: 'Map', icon: MapPin },
      { to: '/stations', label: 'Stations', icon: List },
      { to: '/utilization', label: 'Utilization', icon: BarChart3 },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench },
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
    label: 'Planning',
    roles: ['leadership', 'admin'] as const,
    items: [
      { to: '/forecast', label: 'Forecast', icon: TrendingUp },
    ],
  },
  {
    label: 'Pete',
    roles: ['admin'] as const,
    items: [
      { to: '/pete', label: 'Usage Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Admin',
    roles: ['admin'] as const,
    items: [
      { to: '/admin', label: 'Admin', icon: Users },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/map': 'Map View',
  '/stations': 'Station List',
  '/utilization': 'Utilization',
  '/cost': 'Cost & Energy',
  '/executive': 'Executive Summary',
  '/forecast': 'Forecast & Planning',
  '/maintenance': 'Maintenance',
  '/admin': 'Admin',
  '/pete': 'Usage Analytics',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-charlotte-green-dark flex flex-col transform transition-transform md:relative md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/crown-white.png" alt="Charlotte Crown" className="w-10 h-10" />
            <div>
              <span className="text-white text-lg font-bold tracking-wide">CLT EV</span>
              <p className="text-white/50 text-[10px] leading-tight">City of Charlotte</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 text-white/50 hover:text-white md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
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
                        onClick={() => setMobileMenuOpen(false)}
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
        <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-4 md:px-8">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 mr-2 text-gray-600 hover:text-charlotte-black md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-charlotte-black">{pageTitle}</h1>
            <p className="text-xs text-gray-400">CLT EV Charging Analytics</p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
