import { useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types/roles'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { useAuthStore } from '../../store/authStore'

export function SignupPage() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const { token, register } = useAuthStore()
  const [role, setRole] = useState<UserRole>('OPERATOR')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const hint = useMemo(() => {
    return role === 'ADMIN'
      ? 'ADMIN sign-up requires an existing ADMIN token (sign in as admin first).'
      : 'OPERATOR can sign up without a token.'
  }, [role])

  if (token) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <div className="space-y-4 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">{hint}</div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            >
              <option value="OPERATOR">OPERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
              placeholder="your.name"
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
              placeholder="min 6 characters"
              type="password"
              autoComplete="new-password"
            />
          </div>

          <Button
            onClick={async () => {
              const u = username.trim()
              if (!u) {
                toast.error('Username is required')
                return
              }
              if (!password || password.length < 6) {
                toast.error('Password must be at least 6 characters')
                return
              }
              try {
                setLoading(true)
                await register({ username: u, password, role })
                toast.success('Account created')
              } catch (e: any) {
                toast.error(e?.message ? String(e.message) : 'Sign up failed')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

