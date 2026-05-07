import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { register } from '../../services/authService'
import type { UserRole } from '../../types/roles'

const registerableRoles = ['OPERATOR', 'MANAGER', 'RECEIVER', 'PICKER'] as const satisfies readonly UserRole[]

const schema = z
  .object({
    username: z.string().min(3).max(128),
    password: z.string().min(6).max(128),
    confirmPassword: z.string().min(1),
    role: z.enum(registerableRoles),
  })
  .refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', confirmPassword: '', role: 'OPERATOR' },
    mode: 'onChange',
  })

  const submitting = form.formState.isSubmitting

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm text-slate-600 dark:text-slate-400">WMS</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Register</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create a user and select your role.</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (vals) => {
          try {
            const res = await register({ username: vals.username, password: vals.password, role: vals.role })
            toast.success(res.message || 'Account created')
            navigate('/login', { replace: true })
          } catch {
            toast.error('Registration failed')
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
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Role</label>
          <select
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
            {...form.register('role')}
          >
            {registerableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Password</label>
          <input
            type="password"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            {...form.register('password')}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Confirm password</label>
          <input
            type="password"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            {...form.register('confirmPassword')}
            autoComplete="new-password"
          />
          {form.formState.errors.confirmPassword && (
            <div className="text-xs text-rose-600 dark:text-rose-300">
              {form.formState.errors.confirmPassword.message}
            </div>
          )}
        </div>

        <Button type="submit" disabled={!form.formState.isValid || submitting} className="w-full">
          {submitting ? 'Creating…' : 'Create account'}
        </Button>
      </form>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link className="font-semibold text-amber-700 hover:underline dark:text-amber-300" to="/login">
          Sign in
        </Link>
      </div>
    </div>
  )
}

