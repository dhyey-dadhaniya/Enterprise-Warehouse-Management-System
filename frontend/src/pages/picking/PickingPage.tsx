import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'

export function PickingPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Picking (Operator)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Mobile-friendly step flow (mock).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 1 of 3</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              SKU-1042 · Packaging Tape
            </div>
            <div className="mt-1 text-slate-600 dark:text-slate-400">
              Location: WH-1 / Aisle A3 / Bin B-12
            </div>
            <div className="mt-1 text-slate-600 dark:text-slate-400">Qty: 4</div>
          </div>
          <Button className="w-full">Mark as Picked</Button>
          <Button variant="secondary" className="w-full">
            Report Issue
          </Button>
        </div>
      </Card>
    </div>
  )
}

