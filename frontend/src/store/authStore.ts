import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '../types/roles'
import { login as apiLogin, me as apiMe, register as apiRegister } from '../services/authService'

interface AuthState {
  token: string | null
  role: UserRole | null
  userName: string | null
  login: (input: { username: string; password: string }) => Promise<void>
  register: (input: { username: string; password: string; role: UserRole }) => Promise<void>
  refreshMe: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      userName: null,
      login: async ({ username, password }) => {
        const auth = await apiLogin({ username, password })
        set(() => ({ token: auth.token }))
        const me = await apiMe()
        const isAdmin = me.roles.some((r) => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')
        set(() => ({ userName: me.username, role: isAdmin ? 'ADMIN' : 'OPERATOR' }))
      },
      register: async ({ username, password, role }) => {
        const auth = await apiRegister({ username, password, role })
        set(() => ({ token: auth.token }))
        const me = await apiMe()
        const isAdmin = me.roles.some((r) => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')
        set(() => ({ userName: me.username, role: isAdmin ? 'ADMIN' : 'OPERATOR' }))
      },
      refreshMe: async () => {
        const me = await apiMe()
        const isAdmin = me.roles.some((r) => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')
        set(() => ({ userName: me.username, role: isAdmin ? 'ADMIN' : 'OPERATOR' }))
      },
      logout: () => set(() => ({ token: null, role: null, userName: null })),
    }),
    { name: 'wms.auth' },
  ),
)

