import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  fetchAccountingProducts,
  fetchMaterials,
  updateProductBom,
  updateProductPricing,
  type AccountingProductDto,
  type MaterialDto,
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
  inputFromCents,
  moneyFromCents,
} from "./accountingAdminUi";

type BomLine = { materialId: number; quantity: string };

export function AdminProductAccountingView() {
  const [products, setProducts] = useState<AccountingProductDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingTarget, setPricingTarget] = useState<AccountingProductDto | null>(null);
  const [bomTarget, setBomTarget] = useState<AccountingProductDto | null>(null);
  const [priceForm, setPriceForm] = useState({ selling: "", currency: "UAH", threshold: "60" });
  const [bomForm, setBomForm] = useState({ labour: "", currency: "UAH", lines: [] as BomLine[] });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProducts, nextMaterials] = await Promise.all([
        fetchAccountingProducts(),
        fetchMaterials(true),
      ]);
      setProducts(nextProducts);
      setMaterials(nextMaterials);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openPricing = (product: AccountingProductDto) => {
    setPriceForm({
      selling: inputFromCents(product.sellingPriceCents),
      currency: product.sellingCurrencyCode || "UAH",
      threshold: String(product.marginThresholdPct),
    });
    setPricingTarget(product);
  };

  const openBom = (product: AccountingProductDto) => {
    setBomForm({
      labour: inputFromCents(product.bom?.labourCostCents ?? 0),
      currency: product.bom?.currencyCode || product.sellingCurrencyCode || "UAH",
      lines: product.bom?.items.length
        ? product.bom.items.map((item) => ({
            materialId: item.materialId,
            quantity: String(item.quantityRequired),
          }))
        : [{ materialId: materials[0]?.id ?? 0, quantity: "1" }],
    });
    setBomTarget(product);
  };

  const savePricing = async () => {
    if (!pricingTarget) return;
    const threshold = Number(priceForm.threshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      setError("Margin threshold must be between 0 and 100.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProductPricing(pricingTarget.id, {
        sellingPriceCents: centsFromInput(priceForm.selling),
        sellingCurrencyCode: priceForm.currency.trim() || "UAH",
        marginThresholdPct: threshold,
      });
      setPricingTarget(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save pricing.");
    } finally {
      setSaving(false);
    }
  };

  const saveBom = async () => {
    if (!bomTarget) return;
    if (bomForm.lines.some((line) => !line.materialId || Number(line.quantity) <= 0)) {
      setError("Each BOM line needs a material and quantity greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProductBom(bomTarget.id, {
        labourCostCents: centsFromInput(bomForm.labour),
        currencyCode: bomForm.currency.trim() || "UAH",
        items: bomForm.lines.map((line) => ({
          materialId: line.materialId,
          quantityRequired: Number(line.quantity),
        })),
      });
      setBomTarget(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save BOM.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Selling price is never auto-changed. Flagged products are below your margin threshold.
        </p>
        <Button onClick={() => void load()} disabled={loading} tone="light" aria-label="Refresh products">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading products…
          </div>
        ) : products.length === 0 ? (
          <EmptyState title="No products" detail="Catalog products will appear here for pricing and BOM setup." />
        ) : (
          <>
            <div className="hidden md:block">
              <div
                className="grid gap-3 border-b border-[#2D241E]/10 px-5 py-3 text-[0.68rem] uppercase tracking-[0.12em] text-[#2D241E]/45"
                style={{ gridTemplateColumns: "1.6fr 0.7fr 0.9fr 0.8fr 0.9fr 190px", fontFamily: "'DM Sans', sans-serif" }}
              >
                <span>Product</span>
                <span>SKU</span>
                <span>Selling</span>
                <span>BOM cost</span>
                <span>Margin</span>
                <span>Actions</span>
              </div>
              {products.map((product) => (
                <ProductRow key={product.id} product={product} onPricing={() => openPricing(product)} onBom={() => openBom(product)} />
              ))}
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onPricing={() => openPricing(product)} onBom={() => openBom(product)} />
              ))}
            </div>
          </>
        )}
      </Panel>

      {pricingTarget ? (
        <Dialog
          title="Edit pricing"
          subtitle={`${pricingTarget.name} · selling price is never auto-changed`}
          onClose={() => setPricingTarget(null)}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="sell-price">Selling price</Label>
              <input id="sell-price" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={priceForm.selling} onChange={(e) => setPriceForm((c) => ({ ...c, selling: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="sell-currency">Currency</Label>
              <input id="sell-currency" className={controlClass()} value={priceForm.currency} onChange={(e) => setPriceForm((c) => ({ ...c, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <Label htmlFor="margin-threshold">Margin threshold %</Label>
              <input id="margin-threshold" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={priceForm.threshold} onChange={(e) => setPriceForm((c) => ({ ...c, threshold: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button tone="light" onClick={() => setPricingTarget(null)}>Cancel</Button>
              <Button onClick={() => void savePricing()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save pricing
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {bomTarget ? (
        <Dialog title="Edit BOM" subtitle={bomTarget.name} onClose={() => setBomTarget(null)} wide>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bom-labour">Labour cost</Label>
                <input id="bom-labour" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={bomForm.labour} onChange={(e) => setBomForm((c) => ({ ...c, labour: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="bom-currency">Currency</Label>
                <input id="bom-currency" className={controlClass()} value={bomForm.currency} onChange={(e) => setBomForm((c) => ({ ...c, currency: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="space-y-3">
              {bomForm.lines.map((line, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_120px_44px]">
                  <div>
                    <Label htmlFor={`bom-mat-${index}`}>Material</Label>
                    <select
                      id={`bom-mat-${index}`}
                      className={controlClass()}
                      value={line.materialId || ""}
                      onChange={(e) => setBomForm((c) => ({
                        ...c,
                        lines: c.lines.map((row, i) => i === index ? { ...row, materialId: Number(e.target.value) } : row),
                      }))}
                    >
                      <option value="">Select material</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`bom-qty-${index}`}>Qty</Label>
                    <input
                      id={`bom-qty-${index}`}
                      inputMode="decimal"
                      className={`${controlClass()} tabular-nums`}
                      value={line.quantity}
                      onChange={(e) => setBomForm((c) => ({
                        ...c,
                        lines: c.lines.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row),
                      }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="flex size-11 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                      aria-label="Remove BOM line"
                      onClick={() => setBomForm((c) => ({ ...c, lines: c.lines.filter((_, i) => i !== index) }))}
                      disabled={bomForm.lines.length <= 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              tone="light"
              onClick={() => setBomForm((c) => ({
                ...c,
                lines: [...c.lines, { materialId: materials[0]?.id ?? 0, quantity: "1" }],
              }))}
            >
              <Plus size={14} /> Add material
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button tone="light" onClick={() => setBomTarget(null)}>Cancel</Button>
              <Button onClick={() => void saveBom()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save BOM
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function MarginBadge({ product }: { product: AccountingProductDto }) {
  const pct = product.margin.currentMarginPct;
  if (!product.margin.costAvailable || pct == null) {
    return <StatusPill>No cost</StatusPill>;
  }
  return (
    <StatusPill tone={product.margin.isFlagged ? "danger" : "ok"}>
      {pct.toFixed(1)}%
    </StatusPill>
  );
}

function FlagWarning({ product }: { product: AccountingProductDto }) {
  if (!product.margin.isFlagged || product.margin.currentMarginPct == null) return null;
  const bom = product.margin.currentBomCostCents ?? 0;
  const sell = product.margin.sellingPriceBaseCents ?? product.sellingPriceCents;
  return (
    <p className="mt-2 flex items-start gap-2 text-xs text-[#641D1D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>
        Current margin {product.margin.currentMarginPct.toFixed(1)}% is below your threshold of {product.margin.thresholdPct}%.
        BOM cost is {moneyFromCents(bom, product.sellingCurrencyCode)}, selling at {moneyFromCents(sell, product.sellingCurrencyCode)}.
      </span>
    </p>
  );
}

function ProductRow({
  product,
  onPricing,
  onBom,
}: {
  product: AccountingProductDto;
  onPricing: () => void;
  onBom: () => void;
}) {
  return (
    <div
      className="grid items-start gap-3 border-b border-[#2D241E]/06 px-5 py-4 text-sm last:border-b-0"
      style={{ gridTemplateColumns: "1.6fr 0.7fr 0.9fr 0.8fr 0.9fr 190px", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div>
        <p className="text-[#2D241E]">
          {product.name}
          {product.isInternalComponent ? (
            <span className="ml-2 align-middle"><StatusPill>Internal</StatusPill></span>
          ) : null}
        </p>
        <FlagWarning product={product} />
      </div>
      <span className="text-[#2D241E]/55 tabular-nums">{product.sku || "—"}</span>
      <span className="tabular-nums text-[#2D241E]">
        {moneyFromCents(product.sellingPriceCents, product.sellingCurrencyCode)}
      </span>
      <span className="tabular-nums text-[#2D241E]/70">
        {product.margin.currentBomCostCents != null
          ? moneyFromCents(product.margin.currentBomCostCents, product.sellingCurrencyCode)
          : "—"}
      </span>
      <MarginBadge product={product} />
      <div className="flex gap-1">
        <button type="button" onClick={onPricing} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit pricing for ${product.name}`}>
          <Pencil size={15} />
        </button>
        <button type="button" onClick={onBom} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit BOM for ${product.name}`}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onPricing,
  onBom,
}: {
  product: AccountingProductDto;
  onPricing: () => void;
  onBom: () => void;
}) {
  return (
    <div className="rounded-[18px] bg-white/55 p-4" style={{ border: "1px solid rgba(45,36,30,0.1)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {product.name}
            {product.isInternalComponent ? (
              <span className="ml-2 align-middle"><StatusPill>Internal</StatusPill></span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-[#2D241E]/50">{product.sku || "No SKU"}</p>
        </div>
        <MarginBadge product={product} />
      </div>
      <p className="mt-3 text-sm tabular-nums text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Selling {moneyFromCents(product.sellingPriceCents, product.sellingCurrencyCode)}
        {product.margin.currentBomCostCents != null
          ? ` · BOM ${moneyFromCents(product.margin.currentBomCostCents, product.sellingCurrencyCode)}`
          : ""}
      </p>
      <FlagWarning product={product} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="light" onClick={onPricing}><Pencil size={14} /> Pricing</Button>
        <Button tone="light" onClick={onBom}><Plus size={14} /> BOM</Button>
      </div>
    </div>
  );
}
