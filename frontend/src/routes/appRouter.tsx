import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShellLayout } from '../layouts/AppShellLayout'
import { ProtectedRole } from './protectedRole'
import { DashboardPage } from '../pages/DashboardPage'
import { InventoryPage } from '../pages/inventory/InventoryPage'
import { WarehouseStructurePage } from '../pages/warehouse/WarehouseStructurePage'
import { ReceivingPutawayPage } from '../pages/receiving/ReceivingPutawayPage'
import { OrdersPage } from '../pages/orders/OrdersPage'
import { PickingPage } from '../pages/picking/PickingPage'
import { BarcodeSimPage } from '../pages/barcode/BarcodeSimPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShellLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        element: <ProtectedRole allow={['ADMIN']} />,
        children: [
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'warehouse-structure', element: <WarehouseStructurePage /> },
          { path: 'receiving-putaway', element: <ReceivingPutawayPage /> },
          { path: 'orders', element: <OrdersPage /> },
        ],
      },
      {
        element: <ProtectedRole allow={['OPERATOR']} />,
        children: [{ path: 'picking', element: <PickingPage /> }],
      },
      {
        element: <ProtectedRole allow={['ADMIN', 'OPERATOR']} />,
        children: [{ path: 'barcode', element: <BarcodeSimPage /> }],
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

