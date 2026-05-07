import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { useAuthStore } from '../../store/authStore'
import { confirmPick, listPickTasks } from '../../services/pickingService'

export function PickingPage() {
  const roles = useAuthStore((s) => s.roles)
  const canConfirm = roles.includes('OPERATOR') || roles.includes('ADMIN')

  const [activeIndex, setActiveIndex] = useState(0)

  const pickTasksQ = useQuery({
    queryKey: ['outbound', 'pick-tasks', { status: 'PENDING', page: 1, pageSize: 50 }],
    queryFn: () => listPickTasks({ status: 'PENDING', page: 1, pageSize: 50 }),
    staleTime: 5_000,
  })

  const tasks = pickTasksQ.data?.items ?? []

  const activeTask = useMemo(() => {
    if (tasks.length === 0) return null
    return tasks[Math.min(activeIndex, tasks.length - 1)] ?? null
  }, [activeIndex, tasks])

  const confirmPickM = useMutation({
    mutationFn: async (id: string) => await confirmPick(id),
    onSuccess: async (updated) => {
      toast.success(`Picked ${updated.sku}`)
      await pickTasksQ.refetch()
      setActiveIndex((prev) => Math.max(0, Math.min(prev, tasks.length - 2)))
    },
    onError: () => toast.error('Failed to confirm pick. Check backend logs / permissions.'),
  })

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Picking (Operator)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Confirm picks from the live task queue.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {tasks.length === 0 ? 'No pending picks' : `Task ${Math.min(activeIndex + 1, tasks.length)} of ${tasks.length}`}
          </CardTitle>
        </CardHeader>
        {pickTasksQ.isError ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              Failed to load pick tasks. Make sure backend is running and you are logged in.
            </div>
            <Button variant="secondary" className="w-full" onClick={() => pickTasksQ.refetch()}>
              Retry
            </Button>
          </div>
        ) : pickTasksQ.isPending ? (
          <div className="space-y-3">
            <div className="h-24 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
          </div>
        ) : !activeTask ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
              No pending pick tasks found.
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Ask an admin to create a sales order and allocate it. Then refresh this page.
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => pickTasksQ.refetch()}>
              Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{activeTask.sku}</div>
              <div className="mt-1 text-slate-600 dark:text-slate-400">
                Location: {activeTask.zoneCode ? `${activeTask.zoneCode} / ` : ''}
                {activeTask.binCode}
              </div>
              <div className="mt-1 text-slate-600 dark:text-slate-400">
                Qty: {activeTask.quantityToPick}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Task ID: {activeTask.id} · Route: {activeTask.routeSequence}
              </div>
            </div>

            {!canConfirm ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Your role can view tasks, but confirming picks is currently allowed only for OPERATOR (or ADMIN).
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={!canConfirm || confirmPickM.isPending}
              onClick={() => confirmPickM.mutate(activeTask.id)}
            >
              {confirmPickM.isPending ? 'Marking…' : 'Mark as Picked'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="w-full"
                disabled={activeIndex <= 0 || confirmPickM.isPending}
                onClick={() => setActiveIndex((v) => Math.max(0, v - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={activeIndex >= tasks.length - 1 || confirmPickM.isPending}
                onClick={() => setActiveIndex((v) => Math.min(tasks.length - 1, v + 1))}
              >
                Next
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => toast('Issue reporting is not implemented yet.')}
              disabled={confirmPickM.isPending}
            >
              Report Issue
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

