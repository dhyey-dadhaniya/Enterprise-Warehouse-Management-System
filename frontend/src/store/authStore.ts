import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '../types/roles'

interface AuthState {
  role: UserRole
  userName: string
  setRole: (role: UserRole) => void
  setUserName: (name: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: 'ADMIN',
      userName: 'Warehouse Manager',
      setRole: (role) =>
        set(() => ({
          role,
          userName: role === 'ADMIN' ? 'Warehouse Manager' : 'Floor Operator',
        })),
      setUserName: (userName) => set(() => ({ userName })),
      logout: () => set(() => ({ role: 'OPERATOR', userName: 'Floor Operator' })),
    }),
    { name: 'wms.auth' },
  ),
)

