import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const { token, login } = useAuthStore()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  const hint = useMemo(() => {
    return 'Use admin/admin123 (ADMIN) or operator/op123 (OPERATOR).'
  }, [])

  if (token) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <div className="space-y-4 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">{hint}</div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </div>

          <Button
            onClick={async () => {
              try {
                setLoading(true)
                await login({ username, password })
                toast.success('Signed in')
              } catch (e) {
                toast.error('Login failed. Check credentials and backend.')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="pt-1 text-sm text-slate-600 dark:text-slate-400">
            New here?{' '}
            <Link
              to="/signup"
              className="font-semibold text-slate-900 underline underline-offset-4 dark:text-slate-100"
            >
              Create an account
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

