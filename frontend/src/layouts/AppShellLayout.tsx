import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { TopNav } from '../components/layout/TopNav'
import { MobileSidebar } from '../components/layout/MobileSidebar'

export function AppShellLayout() {
  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 p-4 md:p-6">
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55] dark:opacity-[0.35]">
              <div className="h-full w-full bg-grid" />
            </div>
            <Outlet />
          </main>
        </div>
      </div>
      <MobileSidebar />
    </div>
  )
}

