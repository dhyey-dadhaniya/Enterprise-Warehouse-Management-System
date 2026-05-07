import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '../types/roles'

interface AuthState {
  accessToken: string | null
  username: string | null
  roles: UserRole[]
  hydrated: boolean

  setHydrated: (v: boolean) => void
  setSession: (input: { accessToken: string; username: string; roles: UserRole[] }) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      username: null,
      roles: [],
      hydrated: false,
      setHydrated: (hydrated) => set(() => ({ hydrated })),
      setSession: ({ accessToken, username, roles }) => set(() => ({ accessToken, username, roles })),
      clearSession: () => set(() => ({ accessToken: null, username: null, roles: [] })),
    }),
    {
      name: 'wms.auth',
      partialize: (s) => ({ accessToken: s.accessToken, username: s.username, roles: s.roles }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

