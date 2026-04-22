import { useUiStore } from './uiStore'

export function applyThemeClass() {
  const root = document.documentElement
  const apply = (enabled: boolean) => {
    if (enabled) root.classList.add('dark')
    else root.classList.remove('dark')
  }

  apply(useUiStore.getState().darkMode)

  useUiStore.subscribe((state) => {
    apply(state.darkMode)
  })
}

