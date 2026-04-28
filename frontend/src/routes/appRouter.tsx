import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShellLayout } from '../layouts/AppShellLayout'
import { ProtectedRole } from './protectedRole'
import { PanelIndexRedirect } from './panelIndexRedirect'
import { DashboardPage } from '../pages/DashboardPage'
import { InventoryPage } from '../pages/inventory/InventoryPage'
import { WarehouseStructurePage } from '../pages/warehouse/WarehouseStructurePage'
import { ReceivingPutawayPage } from '../pages/receiving/ReceivingPutawayPage'
import { OrdersPage } from '../pages/orders/OrdersPage'
import { PickingPage } from '../pages/picking/PickingPage'
import { BarcodeSimPage } from '../pages/barcode/BarcodeSimPage'
import { ItemsPage } from '../pages/items/ItemsPage'
import { AuthLayout } from '../pages/auth/AuthLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'

export const appRouter = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/',
    element: <AppShellLayout />,
    children: [
      { index: true, element: <PanelIndexRedirect /> },

      // Back-compat routes → redirect to the correct panel
      { path: 'dashboard', element: <PanelIndexRedirect /> },
      { path: 'inventory', element: <Navigate to="/admin/inventory" replace /> },
      { path: 'warehouse-structure', element: <Navigate to="/admin/warehouse-structure" replace /> },
      { path: 'items', element: <Navigate to="/admin/items" replace /> },
      { path: 'receiving-putaway', element: <Navigate to="/admin/receiving-putaway" replace /> },
      { path: 'orders', element: <Navigate to="/admin/orders" replace /> },
      { path: 'picking', element: <Navigate to="/console/picking" replace /> },
      { path: 'barcode', element: <Navigate to="/console/barcode" replace /> },

      // Admin panel
      {
        element: <ProtectedRole allow={['ADMIN']} />,
        children: [
          { path: 'admin/dashboard', element: <DashboardPage /> },
          { path: 'admin/inventory', element: <InventoryPage /> },
          { path: 'admin/warehouse-structure', element: <WarehouseStructurePage /> },
          { path: 'admin/items', element: <ItemsPage /> },
          { path: 'admin/receiving-putaway', element: <ReceivingPutawayPage /> },
          { path: 'admin/orders', element: <OrdersPage /> },
        ],
      },

      // Console panel (ops)
      {
        element: <ProtectedRole allow={['OPERATOR', 'PICKER']} />,
        children: [{ path: 'console/picking', element: <PickingPage /> }],
      },
      {
        element: <ProtectedRole allow={['OPERATOR', 'RECEIVER']} />,
        children: [{ path: 'console/receiving', element: <ReceivingPutawayPage /> }],
      },
      {
        element: <ProtectedRole allow={['ADMIN', 'OPERATOR', 'MANAGER', 'RECEIVER', 'PICKER']} />,
        children: [
          { path: 'console/dashboard', element: <DashboardPage /> },
          { path: 'console/barcode', element: <BarcodeSimPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

