import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from './pages/LoginPage'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryBalancesPage } from './pages/InventoryBalancesPage'
import { WarehousesPage } from './pages/WarehousesPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="inventory/balances" element={<InventoryBalancesPage />} />
          <Route path="master/warehouses" element={<WarehousesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </>
  )
}

