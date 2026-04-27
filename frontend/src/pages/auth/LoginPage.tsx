import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { login, me } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import type { UserRole } from '../../types/roles'
import { getDefaultLandingPath } from '../../routes/roleLanding'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

function normalizeRoles(roles: string[]): UserRole[] {
  return roles
    .map((r) => r.replace(/^ROLE_/, ''))
    .filter((r): r is UserRole => ['ADMIN', 'MANAGER', 'RECEIVER', 'PICKER', 'OPERATOR'].includes(r))
}

export function LoginPage() {
  const navigate = useNavigate()
  const { accessToken, setSession } = useAuthStore()

  useEffect(() => {
    if (accessToken) navigate('/dashboard', { replace: true })
  }, [accessToken, navigate])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
    mode: 'onChange',
  })

  const submitting = form.formState.isSubmitting

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm text-slate-600 dark:text-slate-400">WMS</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Use backend credentials (default: <span className="text-mono">admin/admin123</span> or{' '}
          <span className="text-mono">operator/op123</span>).
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (vals) => {
          try {
            const auth = await login(vals)
            const info = await me(auth.accessToken)
            setSession({
              accessToken: auth.accessToken,
              username: info.username,
              roles: normalizeRoles(info.roles),
            })
            toast.success('Signed in')
            navigate(getDefaultLandingPath(normalizeRoles(info.roles)), { replace: true })
          } catch {
            toast.error('Invalid username or password')
          }
        })}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Username</label>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            {...form.register('username')}
            autoComplete="username"
          />
          {form.formState.errors.username && (
            <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.username.message}</div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Password</label>
          <input
            type="password"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            {...form.register('password')}
            autoComplete="current-password"
          />
          {form.formState.errors.password && (
            <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.password.message}</div>
          )}
        </div>

        <Button type="submit" disabled={!form.formState.isValid || submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        New here?{' '}
        <Link className="font-semibold text-amber-700 hover:underline dark:text-amber-300" to="/register">
          Create an account
        </Link>
      </div>
    </div>
  )
}

