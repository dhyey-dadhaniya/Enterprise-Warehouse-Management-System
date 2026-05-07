import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCcw, X, Pencil, Trash2, ChevronLeft, PackageCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { listWarehouses, listAllItems, listZones, listBins } from '../../services/catalogService'
import {
  listInboundDocuments,
  getInboundDocument,
  createInboundDocument,
  updateInboundDocument,
  patchInboundDocumentStatus,
  addInboundLine,
  updateInboundLine,
  deleteInboundLine,
  postReceipt,
} from '../../services/inboundService'
import type { InboundDocument, InboundDocumentStatus, InboundDocumentType, InboundLine, ReceivingPostResult } from '../../types/domain'

// ── Status colours ─────────────────────────────────────────────────────────
const statusCls: Record<InboundDocumentStatus, string> = {
  DRAFT:              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  OPEN:               'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  RECEIVING:          'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
  COMPLETED:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  CANCELLED:          'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
}

const ALL_STATUSES: InboundDocumentStatus[] = [
  'DRAFT', 'OPEN', 'RECEIVING', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED',
]

const STATUS_TRANSITIONS: Partial<Record<InboundDocumentStatus, InboundDocumentStatus[]>> = {
  DRAFT:     ['OPEN', 'CANCELLED'],
  OPEN:      ['RECEIVING', 'CANCELLED'],
  RECEIVING: ['PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'],
}

const TRANSITION_LABELS: Partial<Record<InboundDocumentStatus, string>> = {
  OPEN:               'Confirm → OPEN',
  RECEIVING:          'Start Receiving',
  PARTIALLY_RECEIVED: 'Mark Partial',
  COMPLETED:          'Complete',
  CANCELLED:          'Cancel',
}

// ── Helpers ────────────────────────────────────────────────────────────────
const apiErr = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong.'

const emptyCreateForm = {
  documentNumber: '',
  documentType: 'PURCHASE_ORDER' as InboundDocumentType,
  warehouseId: '' as number | '',
  supplierName: '',
  reference: '',
  expectedDeliveryDate: '',
  notes: '',
}

const emptyLineForm = {
  itemId: '' as number | '',
  expectedQty: '',
  receivedQty: '',
  notes: '',
}

// ─────────────────────────────────────────────────────────────────────────────
export function InboundDocumentsPage() {
  // ── List state ──────────────────────────────────────────────────────
  const [docs, setDocs] = useState<InboundDocument[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Filters ─────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<InboundDocumentStatus | ''>('')
  const [filterType, setFilterType] = useState<InboundDocumentType | ''>('')
  const [filterQ, setFilterQ] = useState('')

  // ── Detail view ─────────────────────────────────────────────────────
  const [detail, setDetail] = useState<InboundDocument | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Create / edit header modal ───────────────────────────────────────
  const [showDocModal, setShowDocModal] = useState(false)
  const [isEditHeader, setIsEditHeader] = useState(false)
  const [docForm, setDocForm] = useState(emptyCreateForm)
  const [docSaving, setDocSaving] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)

  // ── Line modal ───────────────────────────────────────────────────────
  const [showLineModal, setShowLineModal] = useState(false)
  const [editingLine, setEditingLine] = useState<InboundLine | null>(null)
  const [lineForm, setLineForm] = useState(emptyLineForm)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)

  // ── Post-receipt modal ───────────────────────────────────────────────
  const [receiptLine, setReceiptLine] = useState<InboundLine | null>(null)
  const [receiptZoneId, setReceiptZoneId] = useState<number | ''>('')
  const [receiptBinId, setReceiptBinId] = useState<number | ''>('')
  const [receiptQty, setReceiptQty] = useState('')
  const [receiptNote, setReceiptNote] = useState('')
  const [receiptZones, setReceiptZones] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [receiptBins, setReceiptBins] = useState<Array<{ id: number; code: string; capacityUnits: number | null }>>([])
  const [receiptSaving, setReceiptSaving] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [receiptResult, setReceiptResult] = useState<ReceivingPostResult | null>(null)

  // ── Master data ──────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [allItems, setAllItems] = useState<Array<{ id: number; sku: string; name: string }>>([])
  const [itemQuery, setItemQuery] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / 20))

  // ── Load master data once ────────────────────────────────────────────
  useEffect(() => {
    listWarehouses().then(setWarehouses).catch(() => {})
    listAllItems().then(setAllItems).catch(() => {})
  }, [])

  // ── Fetch list ───────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const r = await listInboundDocuments({
        status: filterStatus || undefined,
        documentType: filterType || undefined,
        q: filterQ || undefined,
        page,
        size: 20,
      })
      setDocs(r.content)
      setTotal(r.totalElements)
    } catch {
      toast.error('Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType, filterQ, page])

  useEffect(() => { fetchList() }, [fetchList])

  // ── Open detail ──────────────────────────────────────────────────────
  const openDetail = async (id: number) => {
    setDetail(null)
    setDetailLoading(true)
    try {
      setDetail(await getInboundDocument(id))
    } catch {
      toast.error('Failed to load document details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async () => {
    if (!detail) return
    try {
      setDetail(await getInboundDocument(detail.id))
    } catch {}
  }

  // ── Create doc modal ─────────────────────────────────────────────────
  const openCreate = () => {
    setIsEditHeader(false)
    setDocForm(emptyCreateForm)
    setDocError(null)
    setShowDocModal(true)
  }

  // ── Edit header modal ────────────────────────────────────────────────
  const openEditHeader = (doc: InboundDocument) => {
    setIsEditHeader(true)
    setDocForm({
      ...emptyCreateForm,
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      warehouseId: doc.warehouseId,
      supplierName: doc.supplierName ?? '',
      reference: doc.reference ?? '',
      expectedDeliveryDate: doc.expectedDeliveryDate ?? '',
      notes: doc.notes ?? '',
    })
    setDocError(null)
    setShowDocModal(true)
  }

  const handleDocSubmit = async () => {
    if (!docForm.documentNumber || !docForm.warehouseId) {
      setDocError('Document number and warehouse are required.')
      return
    }
    setDocSaving(true)
    setDocError(null)
    try {
      if (isEditHeader && detail) {
        const updated = await updateInboundDocument(detail.id, {
          supplierName: docForm.supplierName || undefined,
          reference: docForm.reference || undefined,
          expectedDeliveryDate: docForm.expectedDeliveryDate || undefined,
          notes: docForm.notes || undefined,
        })
        setDetail(updated)
        toast.success('Document updated.')
      } else {
        const created = await createInboundDocument({
          documentNumber: docForm.documentNumber,
          documentType: docForm.documentType,
          warehouseId: docForm.warehouseId as number,
          supplierName: docForm.supplierName || undefined,
          reference: docForm.reference || undefined,
          expectedDeliveryDate: docForm.expectedDeliveryDate || undefined,
          notes: docForm.notes || undefined,
        })
        toast.success('Document created.')
        fetchList()
        setDetail(created)
      }
      setShowDocModal(false)
    } catch (e) {
      setDocError(apiErr(e))
    } finally {
      setDocSaving(false)
    }
  }

  // ── Status transition ────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: InboundDocumentStatus) => {
    if (!detail) return
    try {
      const updated = await patchInboundDocumentStatus(detail.id, newStatus)
      setDetail(updated)
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      toast.success(`Status → ${newStatus.replace('_', ' ')}`)
    } catch (e) {
      toast.error(apiErr(e))
    }
  }

  // ── Line modal ───────────────────────────────────────────────────────
  const openAddLine = () => {
    setEditingLine(null)
    setLineForm(emptyLineForm)
    setItemQuery('')
    setLineError(null)
    setShowLineModal(true)
  }

  const openEditLine = (line: InboundLine) => {
    setEditingLine(line)
    setLineForm({
      itemId: line.itemId,
      expectedQty: String(line.expectedQty),
      receivedQty: line.receivedQty != null ? String(line.receivedQty) : '',
      notes: line.notes ?? '',
    })
    setItemQuery(line.sku)
    setLineError(null)
    setShowLineModal(true)
  }

  const handleLineSubmit = async () => {
    if (!detail) return
    if (!lineForm.itemId || !lineForm.expectedQty) {
      setLineError('Item and expected quantity are required.')
      return
    }
    setLineSaving(true)
    setLineError(null)
    try {
      if (editingLine) {
        const updated = await updateInboundLine(detail.id, editingLine.id, {
          itemId: lineForm.itemId as number,
          expectedQty: Number(lineForm.expectedQty),
          receivedQty: lineForm.receivedQty ? Number(lineForm.receivedQty) : undefined,
          notes: lineForm.notes || undefined,
        })
        setDetail(updated)
        toast.success('Line updated.')
      } else {
        const updated = await addInboundLine(detail.id, {
          itemId: lineForm.itemId as number,
          expectedQty: Number(lineForm.expectedQty),
          notes: lineForm.notes || undefined,
        })
        setDetail(updated)
        toast.success('Line added.')
      }
      setShowLineModal(false)
    } catch (e) {
      setLineError(apiErr(e))
    } finally {
      setLineSaving(false)
    }
  }

  const handleDeleteLine = async (line: InboundLine) => {
    if (!detail) return
    if (!window.confirm(`Delete line ${line.lineNumber} (${line.sku})?`)) return
    try {
      await deleteInboundLine(detail.id, line.id)
      await refreshDetail()
      toast.success('Line deleted.')
    } catch (e) {
      toast.error(apiErr(e))
    }
  }

  // ── Post-receipt handlers ────────────────────────────────────────────
  const openReceiptModal = async (line: InboundLine) => {
    setReceiptLine(line)
    setReceiptZoneId('')
    setReceiptBinId('')
    setReceiptQty(String(line.expectedQty - line.receivedQty > 0 ? line.expectedQty - line.receivedQty : line.expectedQty))
    setReceiptNote('')
    setReceiptResult(null)
    setReceiptError(null)
    setReceiptBins([])
    // Load zones for this document's warehouse
    if (detail) {
      try {
        const zones = await listZones(detail.warehouseId)
        setReceiptZones(zones)
      } catch {
        setReceiptZones([])
      }
    }
  }

  const handleReceiptZoneChange = async (zoneId: number | '') => {
    setReceiptZoneId(zoneId)
    setReceiptBinId('')
    setReceiptBins([])
    if (zoneId !== '') {
      try {
        setReceiptBins(await listBins(zoneId))
      } catch {
        setReceiptBins([])
      }
    }
  }

  const handlePostReceipt = async () => {
    if (!detail || !receiptLine || receiptBinId === '' || !receiptQty) return
    setReceiptSaving(true)
    setReceiptError(null)
    setReceiptResult(null)
    try {
      const result = await postReceipt(detail.id, receiptLine.id, {
        stagingBinId: receiptBinId as number,
        quantity: Number(receiptQty),
        note: receiptNote || undefined,
      })
      setReceiptResult(result)
      // Refresh document so line quantities and status update
      const updated = await getInboundDocument(detail.id)
      setDetail(updated)
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      toast.success(`Posted ${result.quantityPostedThisRequest} units to inventory.`)
    } catch (e) {
      setReceiptError(apiErr(e))
    } finally {
      setReceiptSaving(false)
    }
  }

  // ── Filtered items for line selector ────────────────────────────────
  const filteredItems = itemQuery.trim()
    ? allItems.filter(
        (i) =>
          i.sku.toLowerCase().includes(itemQuery.toLowerCase()) ||
          i.name.toLowerCase().includes(itemQuery.toLowerCase()),
      )
    : allItems

  // ─────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <div className="flex justify-center py-24 text-sm text-slate-400">Loading document…</div>
    )
  }

  if (detail) {
    const transitions = STATUS_TRANSITIONS[detail.status] ?? []
    const canEditHeader = detail.status === 'DRAFT'
    const canAddLines = detail.status === 'DRAFT' || detail.status === 'OPEN'
    const canPostReceipt = detail.status === 'RECEIVING'

    return (
      <div className="space-y-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {detail.documentNumber}
          </h1>
          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusCls[detail.status])}>
            {detail.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: document header ─────────────────────────────── */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Document Info</h2>
                {canEditHeader && (
                  <Button variant="ghost" size="sm" onClick={() => openEditHeader(detail)}>
                    <Pencil className="size-4 text-slate-500" />
                  </Button>
                )}
              </div>
              <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                <InfoRow label="Type"       value={detail.documentType.replace('_', ' ')} />
                <InfoRow label="Warehouse"  value={detail.warehouseCode} />
                <InfoRow label="Supplier"   value={detail.supplierName ?? '—'} />
                <InfoRow label="Reference"  value={detail.reference ?? '—'} />
                <InfoRow label="Exp. Delivery" value={detail.expectedDeliveryDate ?? '—'} />
                <InfoRow label="Notes"      value={detail.notes ?? '—'} />
                <InfoRow label="Created"    value={new Date(detail.createdAt).toLocaleString()} />
                <InfoRow label="Updated"    value={new Date(detail.updatedAt).toLocaleString()} />
              </dl>
            </div>

            {/* Status transitions */}
            {transitions.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Change Status</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {transitions.map((s) => (
                    <Button
                      key={s}
                      variant={s === 'CANCELLED' ? 'secondary' : 'primary'}
                      size="sm"
                      className={s === 'CANCELLED' ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : ''}
                      onClick={() => handleStatusChange(s)}
                    >
                      {TRANSITION_LABELS[s] ?? s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: lines ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Lines ({detail.lines.length})
              </h2>
              {canAddLines && (
                <Button size="sm" onClick={openAddLine}>
                  <Plus className="size-4" />
                  Add Line
                </Button>
              )}
            </div>

            {detail.lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 py-12 text-sm text-slate-400 dark:border-slate-800">
                No lines yet.
                {canAddLines && (
                  <button onClick={openAddLine} className="underline hover:text-slate-600">
                    Add the first line
                  </button>
                )}
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>#</TH>
                    <TH>SKU</TH>
                    <TH>Item</TH>
                    <TH className="text-right">Expected</TH>
                    <TH className="text-right">Received</TH>
                    <TH className="text-right">Posted</TH>
                    <TH>Notes</TH>
                    <TH className="text-right">Actions</TH>
                    {canPostReceipt && <TH className="text-right">Receipt</TH>}
                  </tr>
                </THead>
                <TBody>
                  {detail.lines.map((l) => (
                    <TR key={l.id}>
                      <TD className="text-xs text-slate-500">{l.lineNumber}</TD>
                      <TD className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{l.sku}</TD>
                      <TD className="text-sm text-slate-900 dark:text-slate-100">{l.itemName}</TD>
                      <TD className="text-right text-sm">{l.expectedQty}</TD>
                      <TD className="text-right text-sm">{l.receivedQty}</TD>
                      <TD className="text-right text-sm text-slate-500">{l.postedQty}</TD>
                      <TD className="text-xs text-slate-500">{l.notes ?? '—'}</TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditLine(l)}>
                            <Pencil className="size-4 text-slate-500" />
                          </Button>
                          {canAddLines && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteLine(l)}>
                              <Trash2 className="size-4 text-rose-500" />
                            </Button>
                          )}
                        </div>
                      </TD>
                      {canPostReceipt && (
                        <TD className="text-right">
                          <Button size="sm" onClick={() => openReceiptModal(l)}>
                            <PackageCheck className="size-4" />
                            Post
                          </Button>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </div>

        {/* ── Edit header modal ──────────────────────────────────── */}
        {showDocModal && isEditHeader && (
          <DocModal
            title="Edit Document Header"
            form={docForm}
            setForm={setDocForm}
            warehouses={warehouses}
            saving={docSaving}
            error={docError}
            isEdit
            onClose={() => setShowDocModal(false)}
            onSubmit={handleDocSubmit}
          />
        )}

        {/* ── Post Receipt modal ────────────────────────────────── */}
        {receiptLine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Post Receipt — Line {receiptLine.lineNumber}
                </h2>
                <button
                  onClick={() => { setReceiptLine(null); setReceiptResult(null) }}
                  className="rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                SKU: <span className="font-mono font-semibold">{receiptLine.sku}</span>
                &nbsp;·&nbsp; Expected: <strong>{receiptLine.expectedQty}</strong>
                &nbsp;·&nbsp; Already received: <strong>{receiptLine.receivedQty}</strong>
              </p>

              {/* Result banner */}
              {receiptResult && (
                <div className={cn(
                  'mt-4 rounded-lg border p-3 text-sm',
                  receiptResult.receivedVersusExpectedMismatch
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
                )}>
                  <div className="font-semibold">
                    {receiptResult.replayed ? 'Replayed (idempotent)' : `Posted ${receiptResult.quantityPostedThisRequest} units`}
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <div>Total posted: <strong>{receiptResult.postedQty}</strong> / expected: <strong>{receiptResult.expectedQty}</strong></div>
                    <div>Document status: <strong>{receiptResult.documentStatus.replace('_', ' ')}</strong></div>
                    <div>Ledger entry ID: <span className="font-mono">#{receiptResult.inventoryLedgerEntryId}</span></div>
                    {receiptResult.receivedVersusExpectedMismatch && (
                      <div className="font-semibold text-amber-700 dark:text-amber-400">⚠ Received qty differs from expected</div>
                    )}
                  </div>
                </div>
              )}

              {!receiptResult && (
                <div className="mt-4 space-y-3">
                  {/* Zone */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Zone *</label>
                    <select
                      value={receiptZoneId}
                      onChange={(e) => handleReceiptZoneChange(e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputCls}
                    >
                      <option value="">Select zone…</option>
                      {receiptZones.map((z) => (
                        <option key={z.id} value={z.id}>{z.code} · {z.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Staging bin */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Staging Bin *</label>
                    <select
                      value={receiptBinId}
                      onChange={(e) => setReceiptBinId(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={receiptZoneId === ''}
                      className={inputCls}
                    >
                      <option value="">{receiptZoneId === '' ? 'Select zone first' : 'Select bin…'}</option>
                      {receiptBins.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}{b.capacityUnits != null ? ` (cap ${b.capacityUnits})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Quantity to Post *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={receiptQty}
                      onChange={(e) => setReceiptQty(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Note</label>
                    <input
                      value={receiptNote}
                      onChange={(e) => setReceiptNote(e.target.value)}
                      placeholder="Optional"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {receiptError && (
                <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{receiptError}</p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setReceiptLine(null); setReceiptResult(null) }}>
                  {receiptResult ? 'Close' : 'Cancel'}
                </Button>
                {!receiptResult && (
                  <Button
                    onClick={handlePostReceipt}
                    disabled={receiptSaving || receiptBinId === '' || !receiptQty}
                  >
                    <PackageCheck className="size-4" />
                    {receiptSaving ? 'Posting…' : 'Post Receipt'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Add / edit line modal ──────────────────────────────── */}
        {showLineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editingLine ? 'Edit Line' : 'Add Line'}
                </h2>
                <button onClick={() => setShowLineModal(false)} className="rounded p-1 text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {/* Item selector */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Item *
                  </label>
                  <input
                    value={itemQuery}
                    onChange={(e) => { setItemQuery(e.target.value); setLineForm((f) => ({ ...f, itemId: '' })) }}
                    placeholder="Search SKU or name…"
                    className={inputCls}
                  />
                  {filteredItems.length > 0 && (
                    <select
                      value={lineForm.itemId}
                      onChange={(e) => setLineForm((f) => ({ ...f, itemId: Number(e.target.value) }))}
                      className={cn(inputCls, 'mt-1.5')}
                    >
                      <option value="">Select item…</option>
                      {filteredItems.map((i) => (
                        <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <MiniField
                  label="Expected Qty *"
                  type="number"
                  value={lineForm.expectedQty}
                  onChange={(v) => setLineForm((f) => ({ ...f, expectedQty: v }))}
                  placeholder="e.g. 100"
                />
                {detail.status === 'RECEIVING' && (
                  <MiniField
                    label="Received Qty"
                    type="number"
                    value={lineForm.receivedQty}
                    onChange={(v) => setLineForm((f) => ({ ...f, receivedQty: v }))}
                    placeholder="Actual received"
                  />
                )}
                <MiniField
                  label="Notes"
                  value={lineForm.notes}
                  onChange={(v) => setLineForm((f) => ({ ...f, notes: v }))}
                  placeholder="Optional"
                />
              </div>

              {lineError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{lineError}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowLineModal(false)} disabled={lineSaving}>Cancel</Button>
                <Button
                  onClick={handleLineSubmit}
                  disabled={lineSaving || !lineForm.itemId || !lineForm.expectedQty}
                >
                  {lineSaving ? 'Saving…' : editingLine ? 'Save' : 'Add Line'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Inbound Documents</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchList} disabled={loading}>
            <RefreshCcw className={cn('size-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={filterQ}
          onChange={(e) => { setFilterQ(e.target.value); setPage(0) }}
          placeholder="Search document #, supplier…"
          className={cn(inputCls, 'w-64')}
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as InboundDocumentStatus | ''); setPage(0) }}
          className={cn(inputCls, 'w-52')}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as InboundDocumentType | ''); setPage(0) }}
          className={cn(inputCls, 'w-48')}
        >
          <option value="">All types</option>
          <option value="PURCHASE_ORDER">Purchase Order</option>
          <option value="ASN">ASN</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-sm text-slate-400">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
          No documents found.
          <button onClick={openCreate} className="underline hover:text-slate-600">Create one</button>
        </div>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Document #</TH>
                <TH>Type</TH>
                <TH>Warehouse</TH>
                <TH>Status</TH>
                <TH>Supplier</TH>
                <TH>Expected Delivery</TH>
                <TH className="text-right">Lines</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {docs.map((d) => (
                <TR key={d.id}>
                  <TD className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {d.documentNumber}
                  </TD>
                  <TD className="text-sm text-slate-600 dark:text-slate-400">
                    {d.documentType.replace('_', ' ')}
                  </TD>
                  <TD className="text-sm">{d.warehouseCode}</TD>
                  <TD>
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusCls[d.status])}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </TD>
                  <TD className="text-sm text-slate-600 dark:text-slate-400">{d.supplierName ?? '—'}</TD>
                  <TD className="text-sm text-slate-500">{d.expectedDeliveryDate ?? '—'}</TD>
                  <TD className="text-right text-sm text-slate-500">{d.lineCount}</TD>
                  <TD className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => openDetail(d.id)}>
                      View
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Prev
              </Button>
              <span className="text-xs">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create modal */}
      {showDocModal && !isEditHeader && (
        <DocModal
          title="New Inbound Document"
          form={docForm}
          setForm={setDocForm}
          warehouses={warehouses}
          saving={docSaving}
          error={docError}
          isEdit={false}
          onClose={() => setShowDocModal(false)}
          onSubmit={handleDocSubmit}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DocModal({
  title, form, setForm, warehouses, saving, error, isEdit, onClose, onSubmit,
}: {
  title: string
  form: typeof emptyCreateForm
  setForm: React.Dispatch<React.SetStateAction<typeof emptyCreateForm>>
  warehouses: Array<{ id: number; code: string; name: string }>
  saving: boolean
  error: string | null
  isEdit: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  const canSubmit = !saving && !!form.documentNumber && !!form.warehouseId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <MiniField
            label="Document Number *"
            value={form.documentNumber}
            onChange={(v) => setForm((f) => ({ ...f, documentNumber: v }))}
            placeholder="e.g. PO-2025-001"
            disabled={isEdit}
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Type *</label>
            <select
              value={form.documentType}
              onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value as InboundDocumentType }))}
              disabled={isEdit}
              className={inputCls}
            >
              <option value="PURCHASE_ORDER">Purchase Order</option>
              <option value="ASN">ASN</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Warehouse *</label>
            <select
              value={form.warehouseId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseId: Number(e.target.value) }))}
              disabled={isEdit}
              className={inputCls}
            >
              <option value="">Select warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code} · {w.name}</option>
              ))}
            </select>
          </div>

          <MiniField
            label="Supplier Name"
            value={form.supplierName}
            onChange={(v) => setForm((f) => ({ ...f, supplierName: v }))}
            placeholder="Optional"
          />
          <MiniField
            label="Reference"
            value={form.reference}
            onChange={(v) => setForm((f) => ({ ...f, reference: v }))}
            placeholder="Optional"
          />
          <MiniField
            label="Expected Delivery Date"
            type="date"
            value={form.expectedDeliveryDate}
            onChange={(v) => setForm((f) => ({ ...f, expectedDeliveryDate: v }))}
          />
          <MiniField
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="Optional"
          />
        </div>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-sm text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}

function MiniField({
  label, value, onChange, placeholder, type = 'text', disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(inputCls, disabled && 'cursor-not-allowed opacity-60')}
      />
    </div>
  )
}

const inputCls =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-500'
