import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55] dark:opacity-[0.35]">
        <div className="h-full w-full bg-grid" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-soft backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/50">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

