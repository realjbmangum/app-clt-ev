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
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token')
          return
        }
        setUser({ id: payload.sub, email: payload.email, name: payload.email.split('@')[0], role: payload.role })
      } catch {
        localStorage.removeItem('token')
      }
    }
  }, [])

  async function login(email: string, password: string) {
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://clt-ev-worker.bmangum1.workers.dev').replace(/\/$/, '')
    const url = `${baseUrl}/api/auth/login`
    console.log('[auth] login URL:', url)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch (err) {
      console.error('[auth] fetch error:', err)
      throw new Error('Cannot reach server. Please try again.')
    }
    console.log('[auth] response status:', res.status)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(err.error || 'Login failed')
    }
    const data = await res.json()
    console.log('[auth] login success, user:', data.user)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    navigate('/')
  }

  function logout() {
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
