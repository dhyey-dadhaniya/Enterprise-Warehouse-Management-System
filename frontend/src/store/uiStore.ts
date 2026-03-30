import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  darkMode: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      darkMode: false,
      toggleSidebar: () => set(() => ({ sidebarCollapsed: !get().sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set(() => ({ sidebarCollapsed })),
      openMobileSidebar: () => set(() => ({ mobileSidebarOpen: true })),
      closeMobileSidebar: () => set(() => ({ mobileSidebarOpen: false })),
      toggleDarkMode: () => set(() => ({ darkMode: !get().darkMode })),
      setDarkMode: (darkMode) => set(() => ({ darkMode })),
    }),
    { name: 'wms.ui' },
  ),
)

