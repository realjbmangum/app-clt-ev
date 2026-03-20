import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export type User = {
  id: number
  email: string
  name: string
  role: 'admin' | 'operations' | 'finance' | 'leadership'
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('clt-ev-user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('clt-ev-user')
      }
    }
  }, [])

  async function login(email: string, password: string) {
    // Demo login — bypass API auth for prototype
    const demoUsers: Record<string, User> = {
      'demo': { id: 1, email: 'admin@cltev.gov', name: 'Admin', role: 'admin' },
      'ops': { id: 2, email: 'ops@cltev.gov', name: 'Operations', role: 'operations' },
      'finance': { id: 3, email: 'finance@cltev.gov', name: 'Finance', role: 'finance' },
      'leadership': { id: 4, email: 'leadership@cltev.gov', name: 'Leadership', role: 'leadership' },
    }

    const demoUser = demoUsers[email.toLowerCase()] || demoUsers[email.split('@')[0].toLowerCase()]
    if (demoUser && (password === 'demo' || password === 'cltev2026')) {
      localStorage.setItem('clt-ev-user', JSON.stringify(demoUser))
      setUser(demoUser)
      navigate('/')
      return
    }

    // Fall back to API auth
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://clt-ev-worker.bmangum1.workers.dev').replace(/\/$/, '')
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Invalid credentials' }))
        throw new Error(err.error || 'Invalid credentials')
      }
      const data = await res.json()
      localStorage.setItem('clt-ev-user', JSON.stringify(data.user))
      setUser(data.user)
      navigate('/')
    } catch {
      throw new Error('Invalid credentials')
    }
  }

  function logout() {
    localStorage.removeItem('clt-ev-user')
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
