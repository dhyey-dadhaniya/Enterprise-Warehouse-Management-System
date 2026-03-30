import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { SidebarContent } from './Sidebar'

export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileSidebarOpen)
  const close = useUiStore((s) => s.closeMobileSidebar)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
        onClick={close}
      />
      <div className="absolute left-0 top-0 h-full w-[86%] max-w-[340px] border-r border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-end p-3">
          <Button variant="ghost" size="sm" onClick={close} aria-label="Close menu">
            <X className="size-4" />
          </Button>
        </div>
        <SidebarContent onNavigate={close} forceExpanded />
      </div>
    </div>
  )
}

