import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, Loader2, Plus, RefreshCw } from "lucide-react";
import {
  completeReturn,
  createReturn,
  fetchReturns,
  fetchSalesOrders,
  voidReturn,
  type AccountingSalesOrderDto,
  type ReturnOrderDto,
} from "../../api/accounting";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorBanner,
  Label,
  Panel,
  StatusPill,
  centsFromInput,
  controlClass,
  dateOnly,
  formatLocalDate,
  inputFromCents,
  localIsoDate,
  moneyFromCents,
  toApiDate,
} from "./accountingAdminUi";

type ReturnLine = {
  salesOrderItemId: number;
  parentOrderItemId: number | null;
  quantity: string;
  maxQty: number;
  productName: string;
};

export function AdminReturnsView() {
  const [returns, setReturns] = useState<ReturnOrderDto[]>([]);
  const [salesOrders, setSalesOrders] = useState<AccountingSalesOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ReturnOrderDto | null>(null);
  const [form, setForm] = useState({
    salesOrderId: 0,
    returnDate: localIsoDate(),
    reason: "customer_request",
    resolution: "restock",
    refund: "",
    notes: "",
    lines: [] as ReturnLine[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextReturns, nextSales] = await Promise.all([
        fetchReturns(),
        fetchSalesOrders(),
      ]);
      setReturns(nextReturns);
      setSalesOrders(nextSales);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSale = useMemo(
    () => salesOrders.find((order) => order.id === form.salesOrderId),
    [salesOrders, form.salesOrderId],
  );

  const openCreate = () => {
    const first = salesOrders[0];
    setForm({
      salesOrderId: first?.id ?? 0,
      returnDate: localIsoDate(),
      reason: "customer_request",
      resolution: "restock",
      refund: first ? inputFromCents(first.netRevenueCents) : "",
      notes: "",
      lines: first
        ? first.items.map((item) => ({
            salesOrderItemId: item.id,
            parentOrderItemId: item.parentOrderItemId,
            quantity: String(item.quantity),
            maxQty: item.quantity,
            productName: item.productName,
          }))
        : [],
    });
    setModalOpen(true);
  };

  const selectSale = (salesOrderId: number) => {
    const order = salesOrders.find((row) => row.id === salesOrderId);
    setForm((current) => ({
      ...current,
      salesOrderId,
      refund: order ? inputFromCents(order.netRevenueCents) : "",
      lines: order
        ? order.items.map((item) => ({
            salesOrderItemId: item.id,
            parentOrderItemId: item.parentOrderItemId,
            quantity: String(item.quantity),
            maxQty: item.quantity,
            productName: item.productName,
          }))
        : [],
    }));
  };

  // Guided cascade: setting a line's return quantity clamps any of its component (child)
  // lines to not exceed the parent — you can't return more lace than bags. The server
  // enforces this too, but keeping the form consistent avoids a confusing rejection.
  const setLineQuantity = (index: number, value: string) => {
    setForm((current) => {
      const target = current.lines[index];
      if (!target) return current;
      const parentQty = Number(value);
      const next = current.lines.map((row, i) => (i === index ? { ...row, quantity: value } : row));
      if (Number.isFinite(parentQty)) {
        for (let i = 0; i < next.length; i++) {
          if (next[i].parentOrderItemId === target.salesOrderItemId) {
            if (Number(next[i].quantity) > parentQty) {
              next[i] = { ...next[i], quantity: String(Math.max(0, parentQty)) };
            }
          }
        }
      }
      return { ...current, lines: next };
    });
  };

  const save = async () => {
    const lines = form.lines.filter((line) => Number(line.quantity) > 0);
    if (!form.salesOrderId || lines.length === 0) {
      setError("Pick a sales order and at least one returned quantity.");
      return;
    }
    if (lines.some((line) => Number(line.quantity) > line.maxQty)) {
      setError("Return quantity cannot exceed the sold quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createReturn({
        salesOrderId: form.salesOrderId,
        returnDate: toApiDate(form.returnDate),
        reason: form.reason,
        resolution: form.resolution,
        refundAmountCents: centsFromInput(form.refund),
        notes: form.notes.trim() || null,
        items: lines.map((line) => ({
          salesOrderItemId: line.salesOrderItemId,
          quantity: Number(line.quantity),
        })),
      });
      setModalOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create return.");
    } finally {
      setSaving(false);
    }
  };

  const onComplete = async (id: number) => {
    setSaving(true);
    setError(null);
    try {
      await completeReturn(id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete return.");
    } finally {
      setSaving(false);
    }
  };

  const onVoid = async () => {
    if (!voidTarget) return;
    setSaving(true);
    setError(null);
    try {
      await voidReturn(voidTarget.id);
      setVoidTarget(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not void return.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Draft returns can be completed (restock, write-off, or reclaim materials) or voided.
        </p>
        <div className="flex gap-2">
          <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh returns">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
          <Button onClick={openCreate} disabled={!salesOrders.length}>
            <Plus size={14} /> New return
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading returns…
          </div>
        ) : returns.length === 0 ? (
          <EmptyState title="No returns" detail="Create a return from an existing sales order." />
        ) : (
          <div className="divide-y divide-[#2D241E]/08">
            {returns.map((row) => (
              <div key={row.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Return #{row.id} · sale #{row.salesOrderId}
                  </p>
                  <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {formatLocalDate(row.returnDate)} · {row.reason.replace(/_/g, " ")} · {row.resolution.replace(/_/g, " ")}
                  </p>
                  <p className="mt-2 text-sm tabular-nums text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Refund {moneyFromCents(row.refundAmountCents, row.currencyCode)}
                    {" · "}
                    {row.items.map((item) => `${item.productName}×${item.quantity}`).join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={row.status === "completed" ? "ok" : row.status === "draft" ? "warn" : "neutral"}>
                    {row.status}
                  </StatusPill>
                  {row.status === "draft" ? (
                    <>
                      <Button tone="light" onClick={() => void onComplete(row.id)} disabled={saving} aria-label={`Complete return ${row.id}`}>
                        <Check size={14} /> Complete
                      </Button>
                      <Button tone="danger" onClick={() => setVoidTarget(row)} disabled={saving} aria-label={`Void return ${row.id}`}>
                        <Ban size={14} /> Void
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {modalOpen ? (
        <Dialog title="Create return" subtitle={selectedSale ? `${selectedSale.customerName} · ${selectedSale.channelName}` : undefined} onClose={() => setModalOpen(false)} wide>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ret-sale">Sales order</Label>
              <select
                id="ret-sale"
                className={controlClass()}
                value={form.salesOrderId || ""}
                onChange={(e) => selectSale(Number(e.target.value))}
              >
                <option value="">Select sale</option>
                {salesOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id} · {order.customerName} · {formatLocalDate(order.orderDate)} · {moneyFromCents(order.netRevenueCents, order.currencyCode)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ret-date">Return date</Label>
                <input id="ret-date" type="date" className={controlClass()} value={dateOnly(form.returnDate)} onChange={(e) => setForm((c) => ({ ...c, returnDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ret-refund">Refund amount</Label>
                <input id="ret-refund" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={form.refund} onChange={(e) => setForm((c) => ({ ...c, refund: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ret-reason">Reason</Label>
                <select id="ret-reason" className={controlClass()} value={form.reason} onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}>
                  <option value="customer_request">Customer request</option>
                  <option value="defective">Defective</option>
                  <option value="wrong_item">Wrong item</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ret-resolution">Resolution</Label>
                <select id="ret-resolution" className={controlClass()} value={form.resolution} onChange={(e) => setForm((c) => ({ ...c, resolution: e.target.value }))}>
                  <option value="restock">Restock</option>
                  <option value="write_off">Write off</option>
                  <option value="reclaim_materials">Reclaim materials</option>
                </select>
                <p className="mt-1 text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Reclaim materials unmakes the bag and credits the raw materials it used back into stock; labour cost is not recovered.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {form.lines
                .map((line, index) => ({ line, index }))
                .filter(({ line }) => line.parentOrderItemId == null)
                .map(({ line, index }) => {
                  const children = form.lines
                    .map((row, i) => ({ row, i }))
                    .filter(({ row }) => row.parentOrderItemId === line.salesOrderItemId);
                  return (
                    <div key={line.salesOrderItemId} className="space-y-2">
                      <div className="grid grid-cols-[1fr_100px] items-end gap-3">
                        <div>
                          <Label htmlFor={`ret-line-${index}`}>{line.productName}</Label>
                          <p className="text-xs text-[#2D241E]/45">Max {line.maxQty}</p>
                        </div>
                        <input
                          id={`ret-line-${index}`}
                          inputMode="numeric"
                          className={`${controlClass()} tabular-nums`}
                          value={line.quantity}
                          onChange={(e) => setLineQuantity(index, e.target.value)}
                          aria-label={`Return quantity for ${line.productName}`}
                        />
                      </div>
                      {children.map(({ row, i }) => (
                        <div key={row.salesOrderItemId} className="grid grid-cols-[1fr_100px] items-end gap-3 pl-4">
                          <div>
                            <Label htmlFor={`ret-line-${i}`}>↳ {row.productName}</Label>
                            <p className="text-xs text-[#2D241E]/45">Max {row.maxQty} · cannot exceed parent</p>
                          </div>
                          <input
                            id={`ret-line-${i}`}
                            inputMode="numeric"
                            className={`${controlClass()} tabular-nums`}
                            value={row.quantity}
                            onChange={(e) => setLineQuantity(i, e.target.value)}
                            aria-label={`Return quantity for ${row.productName}`}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
            <div>
              <Label htmlFor="ret-notes">Notes</Label>
              <textarea id="ret-notes" rows={2} className={controlClass()} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Create draft
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {voidTarget ? (
        <Dialog title="Void draft return?" subtitle={`Return #${voidTarget.id}`} onClose={() => setVoidTarget(null)}>
          <div className="flex justify-end gap-2">
            <Button tone="light" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button tone="danger" onClick={() => void onVoid()} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              Void
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
