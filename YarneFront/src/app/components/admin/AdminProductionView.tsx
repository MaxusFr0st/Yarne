import React, { useCallback, useEffect, useState } from "react";
import { Ban, ChevronDown, ChevronUp, Loader2, Plus, RefreshCw } from "lucide-react";
import {
  createProductionOrder,
  fetchAccountingProducts,
  fetchProductionOrders,
  voidProductionOrder,
  type AccountingProductDto,
  type ProductionOrderDto,
} from "../../api/accounting";
import { fetchColors, fetchSizes, type ColorDto, type SizeDto } from "../../api/admin";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorBanner,
  Label,
  Panel,
  StatusPill,
  controlClass,
  formatLocalDate,
  localIsoDate,
  moneyFromCents,
  toApiDate,
  dateOnly,
} from "./accountingAdminUi";

export function AdminProductionView() {
  const [orders, setOrders] = useState<ProductionOrderDto[]>([]);
  const [products, setProducts] = useState<AccountingProductDto[]>([]);
  const [colors, setColors] = useState<ColorDto[]>([]);
  const [sizes, setSizes] = useState<SizeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ProductionOrderDto | null>(null);
  const [form, setForm] = useState({
    productId: 0,
    quantityProduced: "1",
    quantityRejected: "0",
    productionDate: localIsoDate(),
    notes: "",
    colorId: 0,
    sizeId: 0,
    lace: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextOrders, nextProducts, nextColors, nextSizes] = await Promise.all([
        fetchProductionOrders(),
        fetchAccountingProducts(),
        fetchColors().catch(() => [] as ColorDto[]),
        fetchSizes().catch(() => [] as SizeDto[]),
      ]);
      setOrders(nextOrders);
      setProducts(nextProducts);
      setColors(nextColors);
      setSizes(nextSizes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load production orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({
      productId: products[0]?.id ?? 0,
      quantityProduced: "1",
      quantityRejected: "0",
      productionDate: localIsoDate(),
      notes: "",
      colorId: 0,
      sizeId: 0,
      lace: false,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const produced = Number(form.quantityProduced);
    const rejected = Number(form.quantityRejected);
    if (!form.productId || !Number.isFinite(produced) || produced <= 0 || rejected < 0 || rejected > produced) {
      setError("Enter a valid product, produced qty, and rejected qty (rejected ≤ produced).");
      return;
    }
    if ((form.colorId > 0) !== (form.sizeId > 0)) {
      setError("A variant tag needs both a color and a size (or leave both empty).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProductionOrder({
        productId: form.productId,
        quantityProduced: produced,
        quantityRejected: rejected,
        productionDate: toApiDate(form.productionDate),
        notes: form.notes.trim() || null,
        colorId: form.colorId > 0 ? form.colorId : null,
        sizeId: form.sizeId > 0 ? form.sizeId : null,
        lace: form.colorId > 0 ? form.lace : false,
      });
      setModalOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record production.");
    } finally {
      setSaving(false);
    }
  };

  const onVoid = async () => {
    if (!voidTarget) return;
    setSaving(true);
    setError(null);
    try {
      await voidProductionOrder(voidTarget.id);
      setVoidTarget(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not void production run.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Recording production consumes materials FIFO and adds finished goods stock — independent of customer orders.
        </p>
        <div className="flex gap-2">
          <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh production">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
          <Button onClick={openCreate} disabled={!products.length}>
            <Plus size={14} /> Record production
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading production…
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="No production yet" detail="Record a production run to consume BOM materials and build finished goods." />
        ) : (
          <div className="divide-y divide-[#2D241E]/08">
            {orders.map((order) => {
              const open = expanded === order.id;
              return (
                <div key={order.id} className="px-4 py-4 sm:px-5">
                  <div className="flex w-full items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex flex-1 cursor-pointer items-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                      onClick={() => setExpanded(open ? null : order.id)}
                      aria-expanded={open}
                      aria-label={`Toggle FIFO details for production #${order.id}`}
                    >
                      <div>
                        <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {order.productName}
                        </p>
                        <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          #{order.id} · {formatLocalDate(order.productionDate)} · produced {order.quantityProduced}
                          {order.quantityRejected ? ` · rejected ${order.quantityRejected}` : ""}
                          {` · stock +${order.quantityAddedToStock}`}
                        </p>
                        <p className="mt-2 text-sm tabular-nums text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          COGS {moneyFromCents(order.totalCogsCents)} · materials {moneyFromCents(order.totalMaterialCostCents)} · labour {moneyFromCents(order.totalLabourCostCents)}
                          {order.scrapCostCents > 0 ? ` · scrap loss ${moneyFromCents(order.scrapCostCents)}` : ""}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={order.status === "completed" ? "ok" : order.status === "voided" ? "danger" : "neutral"}>{order.status}</StatusPill>
                      {order.status === "completed" ? (
                        <Button
                          tone="danger"
                          onClick={() => setVoidTarget(order)}
                          disabled={saving}
                          aria-label={`Void production run ${order.id}`}
                        >
                          <Ban size={14} /> Void
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                        onClick={() => setExpanded(open ? null : order.id)}
                        aria-expanded={open}
                        aria-label={`Toggle FIFO details for production #${order.id}`}
                      >
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-4 rounded-2xl bg-white/60 p-4" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                      <p className="mb-3 text-[0.68rem] uppercase tracking-[0.12em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        FIFO material consumption
                      </p>
                      {order.materialConsumptions.length === 0 ? (
                        <p className="text-sm text-[#2D241E]/55">No consumption rows.</p>
                      ) : (
                        <div className="space-y-2">
                          {order.materialConsumptions.map((row) => (
                            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              <span className="text-[#2D241E]">{row.materialName}</span>
                              <span className="tabular-nums text-[#2D241E]/65">
                                qty {row.quantityUsed} · lot #{row.purchaseOrderItemId} · {moneyFromCents(row.unitCostAtUseCents)}/u · {moneyFromCents(row.totalCostCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {order.lots.length > 0 ? (
                        <>
                          <p className="mb-2 mt-4 text-[0.68rem] uppercase tracking-[0.12em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Finished goods lots
                          </p>
                          <div className="space-y-2">
                            {order.lots.map((lot) => (
                              <div key={lot.id} className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <span className="text-[#2D241E]">
                                  Lot #{lot.id}
                                  {lot.colorName || lot.sizeName
                                    ? ` · ${[lot.colorName, lot.sizeName, lot.lace ? "strap" : null].filter(Boolean).join(", ")}`
                                    : ""}
                                </span>
                                <span className="tabular-nums text-[#2D241E]/65">
                                  qty {lot.quantityProduced} ({lot.quantityRemaining} left) · {moneyFromCents(lot.unitCostCents)}/u
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                      {order.notes ? (
                        <p className="mt-3 text-sm text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Notes: {order.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {modalOpen ? (
        <Dialog title="Record production" subtitle="Materials are consumed FIFO from purchase lots" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="prod-product">Product</Label>
              <select
                id="prod-product"
                className={controlClass()}
                value={form.productId || ""}
                onChange={(e) => setForm((c) => ({ ...c, productId: Number(e.target.value) }))}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="prod-qty">Qty produced</Label>
                <input id="prod-qty" inputMode="numeric" className={`${controlClass()} tabular-nums`} value={form.quantityProduced} onChange={(e) => setForm((c) => ({ ...c, quantityProduced: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="prod-reject">Qty rejected</Label>
                <input id="prod-reject" inputMode="numeric" className={`${controlClass()} tabular-nums`} value={form.quantityRejected} onChange={(e) => setForm((c) => ({ ...c, quantityRejected: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="prod-date">Production date</Label>
              <input id="prod-date" type="date" className={controlClass()} value={dateOnly(form.productionDate)} onChange={(e) => setForm((c) => ({ ...c, productionDate: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-[0.68rem] uppercase tracking-[0.12em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Variant (color + size). «З ремінцем» also consumes that color&apos;s ремінець BOM materials.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="prod-color">Color</Label>
                  <select
                    id="prod-color"
                    className={controlClass()}
                    value={form.colorId || ""}
                    onChange={(e) => setForm((c) => ({ ...c, colorId: Number(e.target.value) || 0 }))}
                  >
                    <option value="">No tag</option>
                    {colors.map((color) => (
                      <option key={color.id} value={color.id}>{color.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="prod-size">Size</Label>
                  <select
                    id="prod-size"
                    className={controlClass()}
                    value={form.sizeId || ""}
                    onChange={(e) => setForm((c) => ({ ...c, sizeId: Number(e.target.value) || 0 }))}
                  >
                    <option value="">No tag</option>
                    {sizes.map((size) => (
                      <option key={size.id} value={size.id}>{size.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2D241E]/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <input
                      type="checkbox"
                      className="cursor-pointer rounded accent-[#2D241E]"
                      checked={form.lace}
                      disabled={!form.colorId}
                      onChange={(e) => setForm((c) => ({ ...c, lace: e.target.checked }))}
                    />
                    With strap (ремінець)
                  </label>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="prod-notes">Notes</Label>
              <textarea id="prod-notes" rows={3} className={controlClass()} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button tone="light" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Produce
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {voidTarget ? (
        <Dialog
          title="Void production run?"
          subtitle={`#${voidTarget.id} · ${voidTarget.productName}`}
          onClose={() => setVoidTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#2D241E]/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              This restores the consumed material lots and removes the finished goods this run added.
              Only possible while none of its units have been sold yet.
            </p>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setVoidTarget(null)}>Cancel</Button>
              <Button tone="danger" onClick={() => void onVoid()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Void
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
