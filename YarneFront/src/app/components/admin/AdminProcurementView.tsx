import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban, ChevronDown, ChevronUp, ExternalLink, FileImage, Loader2,
  LockKeyhole, PackageOpen, Pencil, Plus, RefreshCw, Upload, X,
} from "lucide-react";
import {
  createExchangeRate,
  createPurchaseOrder,
  createSupplier,
  fetchAccountingCurrencies,
  fetchExchangeRates,
  fetchMaterials,
  fetchPurchaseOrders,
  fetchSuppliers,
  updatePurchaseOrder,
  updateSupplier,
  uploadAccountingReceipt,
  voidPurchaseOrder,
  voidSupplier,
  type AccountingCurrencyDto,
  type ExchangeRateDto,
  type MaterialDto,
  type PurchaseOrderDto,
  type SavePurchaseOrderRequest,
  type SupplierDto,
} from "../../api/accounting";
import { formatRollBreakdown } from "./rollTracking";

export type ProcurementView = "suppliers" | "purchase-orders" | "currency-rates";

type PurchaseLineForm = {
  materialId: number;
  quantity: string;
  unitPrice: string;
  vat: string;
  itemCount: string;
  lengthPerItem: string;
};

type PurchaseForm = {
  supplierId: number;
  orderDate: string;
  invoiceRef: string;
  status: "draft" | "received" | "cancelled";
  currencyCode: string;
  exchangeRate: string;
  receiptUrl: string;
  lines: PurchaseLineForm[];
};

const ink = "#2D241E";
const paper = "#F5F2ED";
const border = "1px solid rgba(45,36,30,0.12)";
const stitch = {
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(117,72,46,.22) 0 5px, transparent 5px 10px)",
  backgroundSize: "100% 1px",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left bottom",
} as const;

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function formatLocalDate(value: string): string {
  const [year, month, day] = dateOnly(value).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function moneyFromCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function centsFromInput(value: string): number {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) : 0;
}

function inputFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function controlClass(extra = ""): string {
  return `w-full min-h-11 rounded-xl border border-[#2D241E]/15 bg-white/70 px-3.5 py-2.5 text-sm text-[#2D241E] outline-none transition-colors focus:border-[#75482E] focus:ring-2 focus:ring-[#75482E]/20 motion-reduce:transition-none ${extra}`;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.13em] text-[#2D241E]/60"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </label>
  );
}

function Button({
  children,
  onClick,
  disabled,
  tone = "dark",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "dark" | "light" | "danger";
  type?: "button" | "submit";
}) {
  const colors = tone === "dark"
    ? "bg-[#2D241E] text-[#F5F2ED] hover:bg-[#49382D]"
    : tone === "danger"
      ? "bg-[#641D1D] text-white hover:bg-[#7B2424]"
      : "border border-[#2D241E]/15 bg-white/50 text-[#2D241E] hover:bg-white/80";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-medium uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none ${colors}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </button>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[22px] bg-white/45 ${className}`}
      style={{ border }}
    >
      {children}
    </section>
  );
}

function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="proc-dialog-title">
      <button type="button" className="absolute inset-0 cursor-pointer bg-[#2D241E]/55 backdrop-blur-sm" onClick={onClose} aria-label="Close dialog" />
      <div
        className={`relative max-h-[94dvh] w-full overflow-y-auto rounded-t-[26px] bg-[#F5F2ED] p-5 shadow-2xl sm:rounded-[28px] sm:p-7 ${wide ? "sm:max-w-4xl" : "sm:max-w-lg"}`}
        style={{ border }}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 id="proc-dialog-title" className="text-2xl text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PurchaseOrderDto["status"] }) {
  const style = status === "received"
    ? "bg-[#315B42]/10 text-[#315B42]"
    : status === "cancelled"
      ? "bg-[#641D1D]/10 text-[#641D1D]"
      : "bg-[#9A672D]/12 text-[#7A4D1D]";
  return <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] ${style}`}>{status}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <PackageOpen className="mx-auto mb-3 text-[#75482E]/45" size={28} strokeWidth={1.5} />
      <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#2D241E]/55">{detail}</p>
    </div>
  );
}

export function AdminProcurementView({ view }: { view: ProcurementView }) {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [currencies, setCurrencies] = useState<AccountingCurrencyDto[]>([]);
  const [rates, setRates] = useState<ExchangeRateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [supplierModal, setSupplierModal] = useState<SupplierDto | "new" | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", contactInfo: "" });
  const [orderModal, setOrderModal] = useState<PurchaseOrderDto | "new" | null>(null);
  const [voidTarget, setVoidTarget] = useState<{ kind: "supplier" | "order"; id: number; name: string } | null>(null);
  const [rateModal, setRateModal] = useState(false);
  const [rateForm, setRateForm] = useState({ from: "EUR", to: "UAH", rate: "", date: localIsoDate() });
  const [uploading, setUploading] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>({
    supplierId: 0,
    orderDate: localIsoDate(),
    invoiceRef: "",
    status: "draft",
    currencyCode: "UAH",
    exchangeRate: "1",
    receiptUrl: "",
    lines: [{ materialId: 0, quantity: "1", unitPrice: "", vat: "0", itemCount: "", lengthPerItem: "" }],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "suppliers") {
        setSuppliers(await fetchSuppliers());
      } else if (view === "purchase-orders") {
        const [nextOrders, nextSuppliers, nextMaterials, nextCurrencies, nextRates] = await Promise.all([
          fetchPurchaseOrders(),
          fetchSuppliers(),
          fetchMaterials(true),
          fetchAccountingCurrencies(),
          fetchExchangeRates(),
        ]);
        setOrders(nextOrders);
        setSuppliers(nextSuppliers);
        setMaterials(nextMaterials);
        setCurrencies(nextCurrencies);
        setRates(nextRates);
      } else {
        const [nextCurrencies, nextRates] = await Promise.all([
          fetchAccountingCurrencies(),
          fetchExchangeRates(),
        ]);
        setCurrencies(nextCurrencies);
        setRates(nextRates);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load accounting data.");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  const baseCurrency = currencies.find((currency) => currency.isBase)?.code ?? "UAH";

  const resolveRate = useCallback((currencyCode: string, orderDate: string): number | null => {
    if (currencyCode === baseCurrency) return 1;
    const cutoff = `${orderDate}T23:59:59`;
    const match = rates
      .filter((rate) =>
        rate.fromCurrencyCode === currencyCode &&
        rate.toCurrencyCode === baseCurrency &&
        rate.effectiveAt <= cutoff)
      .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
    return match?.rate ?? null;
  }, [baseCurrency, rates]);

  const orderTotal = useMemo(() => purchaseForm.lines.reduce((sum, line) => (
    sum + Math.round((Number(line.quantity) || 0) * centsFromInput(line.unitPrice))
  ), 0), [purchaseForm.lines]);
  const orderVat = useMemo(() => purchaseForm.lines.reduce((sum, line) => sum + centsFromInput(line.vat), 0), [purchaseForm.lines]);

  const openSupplier = (supplier: SupplierDto | "new") => {
    setSupplierForm({
      name: supplier === "new" ? "" : supplier.name,
      contactInfo: supplier === "new" ? "" : supplier.contactInfo ?? "",
    });
    setSupplierModal(supplier);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = { name: supplierForm.name.trim(), contactInfo: supplierForm.contactInfo.trim() || null };
      if (supplierModal === "new") await createSupplier(body);
      else if (supplierModal) await updateSupplier(supplierModal.id, body);
      setSupplierModal(null);
      setSuppliers(await fetchSuppliers());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save supplier.");
    } finally {
      setSaving(false);
    }
  };

  const openOrder = (order: PurchaseOrderDto | "new") => {
    const firstMaterial = materials[0]?.id ?? 0;
    if (order === "new") {
      const currencyCode = currencies.find((currency) => currency.isBase)?.code ?? "UAH";
      const firstMaterialDto = materials.find((material) => material.id === firstMaterial);
      setPurchaseForm({
        supplierId: suppliers[0]?.id ?? 0,
        orderDate: localIsoDate(),
        invoiceRef: "",
        status: "draft",
        currencyCode,
        exchangeRate: "1",
        receiptUrl: "",
        lines: [{
          materialId: firstMaterial,
          quantity: "1",
          unitPrice: "",
          vat: "0",
          itemCount: "",
          lengthPerItem: firstMaterialDto?.trackByItem && firstMaterialDto.defaultLengthPerItem != null
            ? String(firstMaterialDto.defaultLengthPerItem)
            : "",
        }],
      });
    } else {
      setPurchaseForm({
        supplierId: order.supplierId,
        orderDate: dateOnly(order.orderDate),
        invoiceRef: order.invoiceRef ?? "",
        status: order.status,
        currencyCode: order.currencyCode,
        exchangeRate: String(order.exchangeRateToBase),
        receiptUrl: order.receiptUrl ?? "",
        lines: order.items.map((item) => ({
          materialId: item.materialId,
          quantity: String(item.quantityPurchased),
          unitPrice: inputFromCents(item.unitPriceCents),
          vat: inputFromCents(item.vatAmountCents),
          itemCount: item.itemCount != null ? String(item.itemCount) : "",
          lengthPerItem: item.lengthPerItem != null ? String(item.lengthPerItem) : "",
        })),
      });
    }
    setOrderModal(order);
  };

  const updatePurchaseCurrency = (currencyCode: string, orderDate = purchaseForm.orderDate) => {
    const nextRate = resolveRate(currencyCode, orderDate);
    setPurchaseForm((current) => ({
      ...current,
      currencyCode,
      orderDate,
      exchangeRate: nextRate == null ? "" : String(nextRate),
    }));
  };

  const updateLine = (index: number, patch: Partial<PurchaseLineForm>) => {
    setPurchaseForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
    }));
  };

  const saveOrder = async () => {
    const duplicateMaterials = new Set(purchaseForm.lines.map((line) => line.materialId)).size !== purchaseForm.lines.length;
    const rollTrackedIncomplete = purchaseForm.lines.some((line) => {
      const material = materials.find((m) => m.id === line.materialId);
      if (!material?.trackByItem) return false;
      return !(Number(line.itemCount) > 0) || !(Number(line.lengthPerItem) > 0);
    });
    if (!purchaseForm.supplierId || !purchaseForm.exchangeRate || duplicateMaterials || rollTrackedIncomplete ||
      purchaseForm.lines.some((line) => !line.materialId || Number(line.quantity) <= 0 || centsFromInput(line.unitPrice) < 0)) {
      setError(
        duplicateMaterials
          ? "Combine duplicate material lines before saving."
          : rollTrackedIncomplete
            ? "Enter both rolls and length-each for every roll-tracked material line."
            : "Complete every required purchase order field.",
      );
      return;
    }
    const body: SavePurchaseOrderRequest = {
      supplierId: purchaseForm.supplierId,
      orderDate: `${purchaseForm.orderDate}T00:00:00Z`,
      invoiceRef: purchaseForm.invoiceRef.trim() || null,
      status: purchaseForm.status,
      receiptUrl: purchaseForm.receiptUrl || null,
      currencyCode: purchaseForm.currencyCode,
      exchangeRateToBase: Number(purchaseForm.exchangeRate),
      items: purchaseForm.lines.map((line) => {
        const material = materials.find((m) => m.id === line.materialId);
        const isRollTracked = material?.trackByItem ?? false;
        const itemCount = isRollTracked ? Number(line.itemCount) : null;
        const lengthPerItem = isRollTracked ? Number(line.lengthPerItem) : null;
        const quantityPurchased = isRollTracked && itemCount && lengthPerItem
          ? itemCount * lengthPerItem
          : Number(line.quantity);
        return {
          materialId: line.materialId,
          quantityPurchased,
          unitPriceCents: centsFromInput(line.unitPrice),
          vatAmountCents: centsFromInput(line.vat),
          itemCount,
          lengthPerItem,
        };
      }),
    };
    setSaving(true);
    setError(null);
    try {
      if (orderModal === "new") await createPurchaseOrder(body);
      else if (orderModal) await updatePurchaseOrder(orderModal.id, body);
      setOrderModal(null);
      setOrders(await fetchPurchaseOrders());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const uploadReceipt = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the receipt.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const secureUrl = await uploadAccountingReceipt(file);
      setPurchaseForm((current) => ({ ...current, receiptUrl: secureUrl }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Receipt upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setSaving(true);
    setError(null);
    try {
      if (voidTarget.kind === "supplier") {
        await voidSupplier(voidTarget.id);
        setSuppliers(await fetchSuppliers());
      } else {
        await voidPurchaseOrder(voidTarget.id);
        setOrders(await fetchPurchaseOrders());
      }
      setVoidTarget(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not void record.");
    } finally {
      setSaving(false);
    }
  };

  const saveRate = async () => {
    const numericRate = Number(rateForm.rate.replace(",", "."));
    if (!Number.isFinite(numericRate) || numericRate <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await createExchangeRate({
        fromCurrencyCode: rateForm.from,
        toCurrencyCode: rateForm.to,
        rate: numericRate,
        effectiveAt: `${rateForm.date}T00:00:00Z`,
      });
      setRateModal(false);
      setRates(await fetchExchangeRates());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save exchange rate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#75482E]">
            {view === "suppliers" ? "Vendor directory" : view === "purchase-orders" ? "Procurement ledger" : "Currency book"}
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#2D241E]/60">
            {view === "suppliers"
              ? "Keep supplier details close to every purchase lot."
              : view === "purchase-orders"
                ? "Record material lots in their original currency with a rate locked at purchase."
                : "Append dated rates used to value foreign-currency purchases in UAH."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="light" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin motion-reduce:animate-none" : ""} /> Refresh
          </Button>
          {view === "suppliers" ? (
            <Button onClick={() => openSupplier("new")}><Plus size={14} /> Add supplier</Button>
          ) : view === "purchase-orders" ? (
            <Button onClick={() => openOrder("new")} disabled={!suppliers.length || !materials.length}>
              <Plus size={14} /> New purchase
            </Button>
          ) : (
            <Button onClick={() => {
              const from = currencies.find((currency) => !currency.isBase)?.code ?? "EUR";
              const to = currencies.find((currency) => currency.isBase)?.code ?? "UAH";
              setRateForm({ from, to, rate: "", date: localIsoDate() });
              setRateModal(true);
            }}><Plus size={14} /> Add rate</Button>
          )}
        </div>
      </div>

      {error ? (
        <div role="alert" className="mb-5 rounded-xl border border-[#641D1D]/15 bg-[#641D1D]/[0.06] px-4 py-3 text-sm text-[#641D1D]">{error}</div>
      ) : null}

      {loading ? (
        <Panel><div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55"><Loader2 className="animate-spin motion-reduce:animate-none" size={17} /> Loading ledger…</div></Panel>
      ) : view === "suppliers" ? (
        <SuppliersList suppliers={suppliers} onEdit={openSupplier} onVoid={(supplier) => setVoidTarget({ kind: "supplier", id: supplier.id, name: supplier.name })} />
      ) : view === "purchase-orders" ? (
        <>
          {(!suppliers.length || !materials.length) ? (
            <div className="mb-4 rounded-xl border border-[#9A672D]/20 bg-[#9A672D]/[0.07] px-4 py-3 text-sm text-[#6F451B]">
              Add at least one supplier and one active material before recording a purchase.
            </div>
          ) : null}
          <PurchaseOrdersList
            orders={orders}
            expanded={expanded}
            onExpand={(id) => setExpanded(expanded === id ? null : id)}
            onEdit={openOrder}
            onVoid={(order) => setVoidTarget({ kind: "order", id: order.id, name: order.invoiceRef || `purchase #${order.id}` })}
          />
        </>
      ) : (
        <RatesList rates={rates} currencies={currencies} />
      )}

      {supplierModal ? (
        <Dialog title={supplierModal === "new" ? "Add supplier" : "Edit supplier"} onClose={() => setSupplierModal(null)}>
          <div className="space-y-4">
            <div><Label htmlFor="supplier-name">Supplier name</Label><input id="supplier-name" autoFocus value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} className={controlClass()} maxLength={255} /></div>
            <div><Label htmlFor="supplier-contact">Contact details</Label><textarea id="supplier-contact" value={supplierForm.contactInfo} onChange={(event) => setSupplierForm((current) => ({ ...current, contactInfo: event.target.value }))} className={controlClass("min-h-28 resize-y")} maxLength={1000} placeholder="Email, phone, address, payment notes" /></div>
          </div>
          <div className="mt-7 flex justify-end gap-2"><Button tone="light" onClick={() => setSupplierModal(null)}>Cancel</Button><Button onClick={() => void saveSupplier()} disabled={saving || !supplierForm.name.trim()}>{saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : null} Save supplier</Button></div>
        </Dialog>
      ) : null}

      {orderModal ? (
        <Dialog title={orderModal === "new" ? "Record purchase" : `Edit purchase #${orderModal.id}`} subtitle="Prices and VAT are entered as decimals; the ledger stores exact integer cents." onClose={() => setOrderModal(null)} wide>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2"><Label htmlFor="po-supplier">Supplier</Label><select id="po-supplier" value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm((current) => ({ ...current, supplierId: Number(event.target.value) }))} className={controlClass()}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
            <div><Label htmlFor="po-date">Order date</Label><input id="po-date" type="date" value={purchaseForm.orderDate} onChange={(event) => updatePurchaseCurrency(purchaseForm.currencyCode, event.target.value)} className={controlClass()} /></div>
            <div><Label htmlFor="po-status">Status</Label><select id="po-status" value={purchaseForm.status} onChange={(event) => setPurchaseForm((current) => ({ ...current, status: event.target.value as PurchaseForm["status"] }))} className={controlClass()}><option value="draft">Draft</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select></div>
            <div className="sm:col-span-2"><Label htmlFor="po-invoice">Invoice reference</Label><input id="po-invoice" value={purchaseForm.invoiceRef} onChange={(event) => setPurchaseForm((current) => ({ ...current, invoiceRef: event.target.value }))} className={controlClass()} maxLength={150} /></div>
            <div><Label htmlFor="po-currency">Currency</Label><select id="po-currency" value={purchaseForm.currencyCode} onChange={(event) => updatePurchaseCurrency(event.target.value)} className={controlClass()}>{currencies.filter((currency) => ["UAH", "EUR"].includes(currency.code)).map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select></div>
            <div><Label htmlFor="po-rate">Locked rate to {baseCurrency}</Label><div className="relative"><LockKeyhole size={14} className="pointer-events-none absolute left-3.5 top-3.5 text-[#75482E]" /><input id="po-rate" readOnly value={purchaseForm.exchangeRate || "No rate for date"} className={controlClass("pl-9 bg-[#75482E]/[0.06]")} aria-describedby="po-rate-help" /></div><p id="po-rate-help" className="mt-1 text-xs text-[#2D241E]/50">Captured with this purchase.</p></div>
          </div>

          <div className="mt-7" style={stitch}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Material lines</h4>
              <button type="button" onClick={() => setPurchaseForm((current) => {
                const nextMaterialId = materials[0]?.id ?? 0;
                const nextMaterial = materials.find((material) => material.id === nextMaterialId);
                return {
                  ...current,
                  lines: [...current.lines, {
                    materialId: nextMaterialId,
                    quantity: "1",
                    unitPrice: "",
                    vat: "0",
                    itemCount: "",
                    lengthPerItem: nextMaterial?.trackByItem && nextMaterial.defaultLengthPerItem != null
                      ? String(nextMaterial.defaultLengthPerItem)
                      : "",
                  }],
                };
              })} className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.09em] text-[#75482E] hover:bg-[#75482E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"><Plus size={13} /> Add line</button>
            </div>
            <div className="space-y-3 pb-6">
              {purchaseForm.lines.map((line, index) => {
                const lineMaterial = materials.find((material) => material.id === line.materialId);
                const isRollTracked = lineMaterial?.trackByItem ?? false;
                const computedTotal = isRollTracked
                  ? (Number(line.itemCount) || 0) * (Number(line.lengthPerItem) || 0)
                  : null;
                return (
                  <div key={index} className={`grid gap-3 rounded-2xl border border-[#2D241E]/10 bg-white/45 p-3 sm:grid-cols-2 ${isRollTracked ? "lg:grid-cols-[minmax(160px,1.4fr)_0.6fr_0.6fr_0.7fr_0.7fr_0.7fr_44px]" : "lg:grid-cols-[minmax(180px,1.6fr)_0.65fr_0.8fr_0.8fr_44px]"}`}>
                    <div>
                      <Label htmlFor={`po-material-${index}`}>Material</Label>
                      <select
                        id={`po-material-${index}`}
                        value={line.materialId}
                        onChange={(event) => {
                          const nextId = Number(event.target.value);
                          const nextMaterial = materials.find((material) => material.id === nextId);
                          updateLine(index, {
                            materialId: nextId,
                            lengthPerItem: nextMaterial?.trackByItem && nextMaterial.defaultLengthPerItem != null
                              ? String(nextMaterial.defaultLengthPerItem)
                              : "",
                            itemCount: "",
                          });
                        }}
                        className={controlClass()}
                      >
                        {materials.map((material) => <option key={material.id} value={material.id}>{material.name} · {material.unit}</option>)}
                      </select>
                    </div>
                    {isRollTracked ? (
                      <>
                        <div><Label htmlFor={`po-rolls-${index}`}>Rolls</Label><input id={`po-rolls-${index}`} type="number" min="1" step="1" value={line.itemCount} onChange={(event) => {
                          const itemCount = event.target.value;
                          const total = (Number(itemCount) || 0) * (Number(line.lengthPerItem) || 0);
                          updateLine(index, { itemCount, quantity: total > 0 ? String(total) : line.quantity });
                        }} className={controlClass()} /></div>
                        <div><Label htmlFor={`po-length-${index}`}>{`Length each (${lineMaterial?.unit ?? ""})`}</Label><input id={`po-length-${index}`} type="number" min="0.0001" step="0.0001" value={line.lengthPerItem} onChange={(event) => {
                          const lengthPerItem = event.target.value;
                          const total = (Number(line.itemCount) || 0) * (Number(lengthPerItem) || 0);
                          updateLine(index, { lengthPerItem, quantity: total > 0 ? String(total) : line.quantity });
                        }} className={controlClass()} /></div>
                        <div>
                          <Label htmlFor={`po-total-${index}`}>Total</Label>
                          <input id={`po-total-${index}`} readOnly value={computedTotal ? `${computedTotal} ${lineMaterial?.unit ?? ""}` : "—"} className={controlClass("bg-[#75482E]/[0.06]")} />
                        </div>
                      </>
                    ) : (
                      <div><Label htmlFor={`po-quantity-${index}`}>Quantity</Label><input id={`po-quantity-${index}`} type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} className={controlClass()} /></div>
                    )}
                    <div><Label htmlFor={`po-price-${index}`}>Unit price</Label><input id={`po-price-${index}`} inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} className={controlClass()} placeholder="0.00" /></div>
                    <div><Label htmlFor={`po-vat-${index}`}>VAT, total</Label><input id={`po-vat-${index}`} inputMode="decimal" value={line.vat} onChange={(event) => updateLine(index, { vat: event.target.value })} className={controlClass()} placeholder="0.00" /></div>
                    <div className="flex items-end"><button type="button" disabled={purchaseForm.lines.length === 1} onClick={() => setPurchaseForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-[#641D1D] hover:bg-[#641D1D]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641D1D] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Remove material line ${index + 1}`}><X size={16} /></button></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="po-receipt">Receipt image</Label>
              <label htmlFor="po-receipt" className="flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#75482E]/35 bg-[#75482E]/[0.04] p-4 hover:bg-[#75482E]/[0.07] focus-within:ring-2 focus-within:ring-[#75482E]">
                {uploading ? <Loader2 className="animate-spin motion-reduce:animate-none" size={20} /> : purchaseForm.receiptUrl ? <FileImage size={20} /> : <Upload size={20} />}
                <span className="text-sm text-[#2D241E]/65">{uploading ? "Uploading directly to Cloudinary…" : purchaseForm.receiptUrl ? "Receipt attached. Choose another image to replace it." : "Choose JPG, PNG, or WebP receipt"}</span>
                <input id="po-receipt" type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(event) => void uploadReceipt(event.target.files?.[0])} />
              </label>
              {purchaseForm.receiptUrl ? <a href={purchaseForm.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#75482E] underline-offset-4 hover:underline"><ExternalLink size={12} /> View uploaded receipt</a> : null}
            </div>
            <dl className="min-w-56 rounded-2xl border border-[#2D241E]/10 bg-white/55 p-4 text-sm">
              <div className="flex justify-between gap-6 text-[#2D241E]/60"><dt>Subtotal</dt><dd>{moneyFromCents(orderTotal, purchaseForm.currencyCode)}</dd></div>
              <div className="mt-2 flex justify-between gap-6 text-[#2D241E]/60"><dt>VAT</dt><dd>{moneyFromCents(orderVat, purchaseForm.currencyCode)}</dd></div>
              <div className="mt-3 flex justify-between gap-6 border-t border-[#2D241E]/10 pt-3 font-semibold text-[#2D241E]"><dt>Base value</dt><dd>{moneyFromCents(Math.round(orderTotal * (Number(purchaseForm.exchangeRate) || 0)), baseCurrency)}</dd></div>
            </dl>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button tone="light" onClick={() => setOrderModal(null)}>Cancel</Button><Button onClick={() => void saveOrder()} disabled={saving || uploading || !purchaseForm.exchangeRate}>{saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : null} Save purchase</Button></div>
        </Dialog>
      ) : null}

      {rateModal ? (
        <Dialog title="Add exchange rate" subtitle="Rates are append-only so historical purchases remain auditable." onClose={() => setRateModal(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="rate-from">From currency</Label><select id="rate-from" value={rateForm.from} onChange={(event) => setRateForm((current) => ({ ...current, from: event.target.value }))} className={controlClass()}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select></div>
            <div><Label htmlFor="rate-to">To currency</Label><select id="rate-to" value={rateForm.to} onChange={(event) => setRateForm((current) => ({ ...current, to: event.target.value }))} className={controlClass()}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select></div>
            <div><Label htmlFor="rate-value">Rate</Label><input id="rate-value" inputMode="decimal" value={rateForm.rate} onChange={(event) => setRateForm((current) => ({ ...current, rate: event.target.value }))} className={controlClass()} placeholder="e.g. 46.25000000" /></div>
            <div><Label htmlFor="rate-date">Effective date</Label><input id="rate-date" type="date" value={rateForm.date} onChange={(event) => setRateForm((current) => ({ ...current, date: event.target.value }))} className={controlClass()} /></div>
          </div>
          <div className="mt-7 flex justify-end gap-2"><Button tone="light" onClick={() => setRateModal(false)}>Cancel</Button><Button onClick={() => void saveRate()} disabled={saving || rateForm.from === rateForm.to || Number(rateForm.rate) <= 0}>{saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : null} Save rate</Button></div>
        </Dialog>
      ) : null}

      {voidTarget ? (
        <Dialog title={`Void ${voidTarget.kind}`} subtitle="The record stays in the audit history and is removed from active accounting views." onClose={() => setVoidTarget(null)}>
          <p className="text-sm leading-relaxed text-[#2D241E]/70">Void <strong className="text-[#2D241E]">{voidTarget.name}</strong>? This action cannot be reversed.</p>
          <div className="mt-7 flex justify-end gap-2"><Button tone="light" onClick={() => setVoidTarget(null)}>Keep record</Button><Button tone="danger" onClick={() => void confirmVoid()} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Ban size={14} />} Void record</Button></div>
        </Dialog>
      ) : null}
    </div>
  );
}

function SuppliersList({ suppliers, onEdit, onVoid }: { suppliers: SupplierDto[]; onEdit: (supplier: SupplierDto) => void; onVoid: (supplier: SupplierDto) => void }) {
  return (
    <Panel>
      {suppliers.length === 0 ? <EmptyState title="No suppliers yet" detail="Add the first vendor to connect purchases to a reliable source." /> : (
        <div className="divide-y divide-[#2D241E]/[0.07]">
          {suppliers.map((supplier) => (
            <article key={supplier.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-white/35 motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_minmax(180px,1.2fr)_auto] sm:items-center sm:px-5" style={stitch}>
              <div><h3 className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{supplier.name}</h3><p className="text-xs text-[#2D241E]/45">Supplier #{supplier.id} · updated {formatLocalDate(supplier.updatedAt)}</p></div>
              <p className="whitespace-pre-line text-sm text-[#2D241E]/65">{supplier.contactInfo || "No contact details"}</p>
              <div className="flex gap-1 sm:justify-end">
                <button type="button" onClick={() => onEdit(supplier)} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit ${supplier.name}`}><Pencil size={15} /></button>
                <button type="button" onClick={() => onVoid(supplier)} className="flex size-11 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641D1D]" aria-label={`Void ${supplier.name}`}><Ban size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PurchaseOrdersList({ orders, expanded, onExpand, onEdit, onVoid }: { orders: PurchaseOrderDto[]; expanded: number | null; onExpand: (id: number) => void; onEdit: (order: PurchaseOrderDto) => void; onVoid: (order: PurchaseOrderDto) => void }) {
  return (
    <Panel>
      {orders.length === 0 ? <EmptyState title="No purchase lots yet" detail="Record an invoice to establish material cost and available lot quantity." /> : (
        <div className="divide-y divide-[#2D241E]/[0.07]">
          {orders.map((order) => (
            <article key={order.id}>
              <div className="grid gap-3 px-4 py-4 transition-colors hover:bg-white/35 motion-reduce:transition-none md:grid-cols-[0.8fr_1.4fr_0.8fr_0.8fr_0.8fr_auto] md:items-center md:px-5" style={stitch}>
                <div><p className="text-xs text-[#2D241E]/45">{formatLocalDate(order.orderDate)}</p><p className="font-semibold text-[#2D241E]">#{order.id}</p></div>
                <div><p className="font-medium text-[#2D241E]">{order.supplierName}</p><p className="text-xs text-[#2D241E]/50">{order.invoiceRef || "No invoice reference"}</p></div>
                <div><StatusBadge status={order.status} /></div>
                <div><p className="font-medium text-[#2D241E]">{moneyFromCents(order.totalCostCents, order.currencyCode)}</p><p className="text-xs text-[#2D241E]/45">VAT {moneyFromCents(order.vatAmountCents, order.currencyCode)}</p></div>
                <div><p className="text-sm text-[#2D241E]/70">{order.currencyCode} × {order.exchangeRateToBase.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p><p className="text-xs text-[#2D241E]/45">{moneyFromCents(order.baseTotalCostCents, "UAH")} base</p></div>
                <div className="flex gap-1 md:justify-end">
                  {order.status === "draft" ? <button type="button" onClick={() => onEdit(order)} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit purchase ${order.id}`}><Pencil size={15} /></button> : null}
                  <button type="button" onClick={() => onVoid(order)} className="flex size-11 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641D1D]" aria-label={`Void purchase ${order.id}`}><Ban size={15} /></button>
                  <button type="button" onClick={() => onExpand(order.id)} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-expanded={expanded === order.id} aria-label={`${expanded === order.id ? "Hide" : "Show"} purchase ${order.id} lots`}>{expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>
              {expanded === order.id ? (
                <div className="bg-[#75482E]/[0.035] px-4 py-4 md:px-6">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {order.items.map((item) => {
                      const breakdown = item.itemCount != null
                        ? formatRollBreakdown(item.wholeItemsRemaining, item.partialRemainder, item.quantityRemaining, item.materialUnit)
                        : null;
                      return (
                        <div key={item.id} className="rounded-xl border border-[#2D241E]/10 bg-white/55 p-3">
                          <div className="flex justify-between gap-3"><p className="font-medium text-[#2D241E]">{item.materialName}</p><span className="text-xs text-[#2D241E]/50">Lot {item.id}</span></div>
                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#2D241E]/60">
                            <span>Purchased</span>
                            <span className="text-right text-[#2D241E]">
                              {item.itemCount != null ? `${item.itemCount} rolls × ${item.lengthPerItem} ${item.materialUnit}` : `${item.quantityPurchased} ${item.materialUnit}`}
                            </span>
                            <span>Remaining</span><span className="text-right font-semibold text-[#315B42]">{item.quantityRemaining} {item.materialUnit}</span>
                            <span>Unit cost</span><span className="text-right">{moneyFromCents(item.unitPriceCents, order.currencyCode)}</span>
                          </div>
                          {breakdown ? <p className="mt-2 text-xs text-[#2D241E]/50">{breakdown}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                  {order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#75482E] hover:underline"><FileImage size={14} /> Open receipt <ExternalLink size={12} /></a> : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function RatesList({ rates, currencies }: { rates: ExchangeRateDto[]; currencies: AccountingCurrencyDto[] }) {
  const currentByPair = new Set<string>();
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <Panel>
        {rates.length === 0 ? <EmptyState title="No exchange rates yet" detail="Add a EUR to UAH rate before posting a euro purchase." /> : (
          <div className="divide-y divide-[#2D241E]/[0.07]">
            {rates.map((rate) => {
              const pair = `${rate.fromCurrencyCode}-${rate.toCurrencyCode}`;
              const isCurrent = !currentByPair.has(pair);
              currentByPair.add(pair);
              return (
                <div key={rate.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:grid-cols-[0.8fr_1fr_1fr_auto] sm:px-5" style={stitch}>
                  <p className="font-semibold text-[#2D241E]">{rate.fromCurrencyCode} / {rate.toCurrencyCode}</p>
                  <p className="text-sm text-[#2D241E]/60">{formatLocalDate(rate.effectiveAt)}</p>
                  <p className="font-mono text-sm tabular-nums text-[#2D241E]">{rate.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${isCurrent ? "bg-[#315B42]/10 text-[#315B42]" : "bg-[#2D241E]/5 text-[#2D241E]/45"}`}>{isCurrent ? "Current" : "Historical"}</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <Panel className="h-fit p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#75482E]">Currency setup</p>
        <div className="mt-4 space-y-3">
          {currencies.map((currency) => (
            <div key={currency.code} className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold text-[#2D241E]">{currency.code}</p><p className="text-xs text-[#2D241E]/50">{currency.name}</p></div>
              <span className="text-xs text-[#2D241E]/55">{currency.isBase ? "Base" : currency.symbol}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
