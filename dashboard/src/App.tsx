import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MapView from './pages/MapView'
import StationList from './pages/StationList'
import Utilization from './pages/Utilization'
import CostEnergy from './pages/CostEnergy'
import Executive from './pages/Executive'
import Admin from './pages/Admin'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './lib/auth'

function ProtectedRoutes() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/map" />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/stations" element={<StationList />} />
        <Route path="/utilization" element={<Utilization />} />
        <Route path="/cost" element={<CostEnergy />} />
        <Route path="/executive" element={<Executive />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  )
}
