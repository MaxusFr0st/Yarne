import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  Megaphone,
  BarChart3,
  Tag,
  ShoppingBag,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  fetchAccountingCategories,
  fetchAccountingPurchases,
  fetchMarketingExpenditures,
  fetchAccountingDashboard,
  fetchAccountingReport,
  downloadAccountingReportPdf,
  createAccountingCategory,
  updateAccountingCategory,
  deleteAccountingCategory,
  createAccountingPurchase,
  updateAccountingPurchase,
  deleteAccountingPurchase,
  createMarketingExpenditure,
  updateMarketingExpenditure,
  deleteMarketingExpenditure,
  type AccountingCategoryDto,
  type AccountingPurchaseDto,
  type MarketingExpenditureDto,
  type AccountingDashboardDto,
  type AccountingReportDto,
} from "../../api/accounting";

const easing = [0.25, 0.1, 0.25, 1] as const;

type AccountingSection = "overview" | "categories" | "purchases" | "marketing" | "reports";

function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatEuro(value: number): string {
  return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const cardBorder = { border: "1px solid rgba(45,36,30,0.08)" };
const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.7rem",
  letterSpacing: "0.12em",
  color: "rgba(45,36,30,0.45)",
  textTransform: "uppercase",
};
const inputStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  border: "1px solid rgba(45,36,30,0.12)",
  backgroundColor: "rgba(255,255,255,0.6)",
};

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[#F5F2ED] transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
      style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em" }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full transition-colors duration-200 hover:bg-[#2D241E]/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      style={{ ...cardBorder, fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", color: "#2D241E" }}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-[20px] p-5 md:p-6 transition-colors duration-200" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <span style={labelStyle}>{label}</span>
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent ?? "rgba(45,36,30,0.06)", color: "#2D241E" }}>
          {icon}
        </span>
      </div>
      <p className="text-[#2D241E] leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.75rem", fontWeight: 500 }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-[#2D241E]/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-[#2D241E]/40 cursor-pointer" onClick={onClose} aria-label="Close" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: easing }}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6 md:p-8"
        style={{ backgroundColor: "#F5F2ED", ...cardBorder }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}>
            {title}
          </h3>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors cursor-pointer" aria-label="Close">
            <X size={18} style={{ color: "#2D241E", opacity: 0.6 }} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block mb-1.5" style={labelStyle}>{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 rounded-xl text-[#2D241E] text-sm outline-none focus:ring-2 focus:ring-[#2D241E]/15 transition-shadow duration-200 ${props.className ?? ""}`}
      style={inputStyle}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-4 py-2.5 rounded-xl text-[#2D241E] text-sm outline-none focus:ring-2 focus:ring-[#2D241E]/15 transition-shadow duration-200 resize-y min-h-[80px] ${props.className ?? ""}`}
      style={inputStyle}
    />
  );
}

export function AdminAccountingTab() {
  const [section, setSection] = useState<AccountingSection>("overview");
  const [dateFrom, setDateFrom] = useState(monthStartIso);
  const [dateTo, setDateTo] = useState(todayIso);

  const [categories, setCategories] = useState<AccountingCategoryDto[]>([]);
  const [purchases, setPurchases] = useState<AccountingPurchaseDto[]>([]);
  const [marketing, setMarketing] = useState<MarketingExpenditureDto[]>([]);
  const [dashboard, setDashboard] = useState<AccountingDashboardDto | null>(null);
  const [report, setReport] = useState<AccountingReportDto | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [reportCategoryIds, setReportCategoryIds] = useState<number[]>([]);
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includePurchases, setIncludePurchases] = useState(true);
  const [includeMarketing, setIncludeMarketing] = useState(true);

  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing: AccountingCategoryDto | null }>({ open: false, editing: null });
  const [purchaseModal, setPurchaseModal] = useState<{ open: boolean; editing: AccountingPurchaseDto | null }>({ open: false, editing: null });
  const [marketingModal, setMarketingModal] = useState<{ open: boolean; editing: MarketingExpenditureDto | null }>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "purchase" | "marketing"; id: number; name: string } | null>(null);

  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [purchaseForm, setPurchaseForm] = useState({
    categoryId: 0,
    name: "",
    description: "",
    supplier: "",
    purchaseDate: todayIso(),
    receivedDate: "",
    soldDate: "",
    quantity: "1",
    quantitySold: "0",
    unitCost: "",
    saleUnitPrice: "",
    notes: "",
  });
  const [marketingForm, setMarketingForm] = useState({
    name: "",
    description: "",
    amount: "",
    expenseDate: todayIso(),
    notes: "",
  });

  const sections: { key: AccountingSection; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { key: "categories", label: "Categories", icon: <Tag size={14} /> },
    { key: "purchases", label: "Purchases", icon: <ShoppingBag size={14} /> },
    { key: "marketing", label: "Marketing", icon: <Megaphone size={14} /> },
    { key: "reports", label: "Reports", icon: <Download size={14} /> },
  ];

  const loadBaseData = useCallback(async () => {
    const [cats, purch, mkt] = await Promise.all([
      fetchAccountingCategories(),
      fetchAccountingPurchases(),
      fetchMarketingExpenditures(),
    ]);
    setCategories(cats);
    setPurchases(purch);
    setMarketing(mkt);
    return cats;
  }, []);

  const loadDashboard = useCallback(async () => {
    const data = await fetchAccountingDashboard(dateFrom, dateTo);
    setDashboard(data);
  }, [dateFrom, dateTo]);

  const loadReport = useCallback(async () => {
    const data = await fetchAccountingReport({
      from: dateFrom,
      to: dateTo,
      categoryIds: reportCategoryIds.length ? reportCategoryIds : undefined,
      includeOrders,
      includePurchases,
      includeMarketing,
    });
    setReport(data);
  }, [dateFrom, dateTo, reportCategoryIds, includeOrders, includePurchases, includeMarketing]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadBaseData();
      if (section === "overview") await loadDashboard();
      if (section === "reports") await loadReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounting data");
    } finally {
      setLoading(false);
    }
  }, [loadBaseData, loadDashboard, loadReport, section]);

  useEffect(() => {
    void refresh();
  }, [section]);

  useEffect(() => {
    if (section === "overview") void loadDashboard().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [dateFrom, dateTo, section, loadDashboard]);

  const openCategoryModal = (editing: AccountingCategoryDto | null) => {
    setCatForm({ name: editing?.name ?? "", description: editing?.description ?? "" });
    setCategoryModal({ open: true, editing });
  };

  const openPurchaseModal = (editing: AccountingPurchaseDto | null) => {
    const defaultCat = categories[0]?.id ?? 0;
    setPurchaseForm({
      categoryId: editing?.categoryId ?? defaultCat,
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      supplier: editing?.supplier ?? "",
      purchaseDate: editing?.purchaseDate?.slice(0, 10) ?? todayIso(),
      receivedDate: editing?.receivedDate?.slice(0, 10) ?? "",
      soldDate: editing?.soldDate?.slice(0, 10) ?? "",
      quantity: String(editing?.quantity ?? 1),
      quantitySold: String(editing?.quantitySold ?? 0),
      unitCost: editing ? String(editing.unitCost) : "",
      saleUnitPrice: editing?.saleUnitPrice != null ? String(editing.saleUnitPrice) : "",
      notes: editing?.notes ?? "",
    });
    setPurchaseModal({ open: true, editing });
  };

  const openMarketingModal = (editing: MarketingExpenditureDto | null) => {
    setMarketingForm({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      amount: editing ? String(editing.amount) : "",
      expenseDate: editing?.expenseDate?.slice(0, 10) ?? todayIso(),
      notes: editing?.notes ?? "",
    });
    setMarketingModal({ open: true, editing });
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const body = { name: catForm.name.trim(), description: catForm.description.trim() || null };
      if (categoryModal.editing) {
        await updateAccountingCategory(categoryModal.editing.id, body);
      } else {
        await createAccountingCategory(body);
      }
      setCategoryModal({ open: false, editing: null });
      await loadBaseData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePurchase = async () => {
    if (!purchaseForm.name.trim() || !purchaseForm.categoryId) return;
    const quantity = parseInt(purchaseForm.quantity, 10);
    const quantitySold = parseInt(purchaseForm.quantitySold, 10);
    const unitCost = parseFloat(purchaseForm.unitCost);
    if (Number.isNaN(quantity) || Number.isNaN(quantitySold) || Number.isNaN(unitCost)) return;

    const body = {
      categoryId: purchaseForm.categoryId,
      name: purchaseForm.name.trim(),
      description: purchaseForm.description.trim() || null,
      supplier: purchaseForm.supplier.trim() || null,
      purchaseDate: purchaseForm.purchaseDate,
      receivedDate: purchaseForm.receivedDate || null,
      soldDate: purchaseForm.soldDate || null,
      quantity,
      quantitySold,
      unitCost,
      saleUnitPrice: purchaseForm.saleUnitPrice ? parseFloat(purchaseForm.saleUnitPrice) : null,
      notes: purchaseForm.notes.trim() || null,
    };

    setLoading(true);
    setError(null);
    try {
      if (purchaseModal.editing) {
        await updateAccountingPurchase(purchaseModal.editing.id, body);
      } else {
        await createAccountingPurchase(body);
      }
      setPurchaseModal({ open: false, editing: null });
      await loadBaseData();
      if (section === "overview") await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarketing = async () => {
    if (!marketingForm.name.trim()) return;
    const amount = parseFloat(marketingForm.amount);
    if (Number.isNaN(amount)) return;

    const body = {
      name: marketingForm.name.trim(),
      description: marketingForm.description.trim() || null,
      amount,
      expenseDate: marketingForm.expenseDate,
      notes: marketingForm.notes.trim() || null,
    };

    setLoading(true);
    setError(null);
    try {
      if (marketingModal.editing) {
        await updateMarketingExpenditure(marketingModal.editing.id, body);
      } else {
        await createMarketingExpenditure(body);
      }
      setMarketingModal({ open: false, editing: null });
      await loadBaseData();
      if (section === "overview") await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    setError(null);
    try {
      if (deleteTarget.type === "category") await deleteAccountingCategory(deleteTarget.id);
      else if (deleteTarget.type === "purchase") await deleteAccountingPurchase(deleteTarget.id);
      else await deleteMarketingExpenditure(deleteTarget.id);
      setDeleteTarget(null);
      await loadBaseData();
      if (section === "overview") await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      await downloadAccountingReportPdf({
        from: dateFrom,
        to: dateTo,
        categoryIds: reportCategoryIds.length ? reportCategoryIds : undefined,
        includeOrders,
        includePurchases,
        includeMarketing,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  const toggleReportCategory = (id: number) => {
    setReportCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const netPositive = (dashboard?.net ?? 0) >= 0;

  const dateRangeBar = (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 mb-6 p-4 md:p-5 rounded-[20px]" style={{ ...cardBorder, backgroundColor: "rgba(45,36,30,0.02)" }}>
      <div className="flex-1 min-w-[140px]">
        <FieldLabel>From</FieldLabel>
        <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="flex-1 min-w-[140px]">
        <FieldLabel>To</FieldLabel>
        <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
      <div className="flex gap-2 sm:pb-0.5">
        <GhostButton onClick={() => refresh()} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span className="uppercase tracking-widest">Refresh</span>
        </GhostButton>
      </div>
    </div>
  );

  const overviewContent = (
    <>
      {dateRangeBar}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total revenue" value={formatEuro(dashboard?.totalRevenue ?? 0)} sub={`Orders: ${formatEuro(dashboard?.orderRevenue ?? 0)} · Manual: ${formatEuro(dashboard?.manualSaleRevenue ?? 0)}`} icon={<TrendingUp size={16} />} accent="rgba(34,120,80,0.12)" />
        <KpiCard label="Total spent" value={formatEuro(dashboard?.totalSpent ?? 0)} sub={`Purchases: ${formatEuro(dashboard?.purchaseSpend ?? 0)} · Marketing: ${formatEuro(dashboard?.marketingSpend ?? 0)}`} icon={<TrendingDown size={16} />} accent="rgba(74,14,14,0.1)" />
        <KpiCard label="Net (revenue − spend)" value={formatEuro(dashboard?.net ?? 0)} sub={netPositive ? "Positive period" : "Negative period"} icon={netPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />} accent={netPositive ? "rgba(34,120,80,0.12)" : "rgba(74,14,14,0.1)"} />
        <KpiCard label="Orders sold" value={String(dashboard?.totalOrdersSold ?? 0)} sub="Store orders in period" icon={<ShoppingBag size={16} />} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Remaining inventory" value={String(dashboard?.remainingInventoryItems ?? 0)} sub="Units still in stock" icon={<Package size={16} />} />
        <KpiCard label="Inventory value" value={formatEuro(dashboard?.remainingInventoryValue ?? 0)} sub="At purchase cost" icon={<Package size={16} />} accent="rgba(45,36,30,0.06)" />
      </div>
    </>
  );

  const categoriesContent = (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{categories.length} categories</p>
        <PrimaryButton onClick={() => openCategoryModal(null)}>
          <Plus size={14} />
          <span className="uppercase tracking-widest">Add category</span>
        </PrimaryButton>
      </div>
      <div className="rounded-[28px] overflow-hidden hidden md:block" style={cardBorder}>
        <TableHeader cols={["Category", "Description", "Actions"]} widths="1fr 1.5fr 100px" />
        <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
          {categories.length === 0 ? (
            <EmptyRow message="No categories yet" />
          ) : (
            categories.map((c) => (
              <div key={c.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200" style={{ gridTemplateColumns: "1fr 1.5fr 100px" }}>
                <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{c.name}</p>
                <p className="text-sm text-[#2D241E]/55 truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{c.description || "—"}</p>
                <ActionButtons onEdit={() => openCategoryModal(c)} onDelete={() => setDeleteTarget({ type: "category", id: c.id, name: c.name })} />
              </div>
            ))
          )}
        </div>
      </div>
      <div className="md:hidden space-y-3">
        {categories.length === 0 ? (
          <EmptyCard message="No categories yet" />
        ) : (
          categories.map((c) => (
            <MobileCard key={c.id} title={c.name} subtitle={c.description || undefined} onEdit={() => openCategoryModal(c)} onDelete={() => setDeleteTarget({ type: "category", id: c.id, name: c.name })} />
          ))
        )}
      </div>
    </>
  );

  const purchasesContent = (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{purchases.length} purchases</p>
        <PrimaryButton onClick={() => openPurchaseModal(null)} disabled={categories.length === 0}>
          <Plus size={14} />
          <span className="uppercase tracking-widest">Add purchase</span>
        </PrimaryButton>
      </div>
      {categories.length === 0 && (
        <p className="mb-4 text-sm text-[#4A0E0E]/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Create at least one category before adding purchases.</p>
      )}
      <div className="rounded-[28px] overflow-x-auto hidden lg:block" style={cardBorder}>
        <TableHeader cols={["Item", "Category", "Supplier", "Bought", "Received", "Sold", "Qty", "Cost", "Remaining"]} widths="1.2fr 0.8fr 0.9fr 0.7fr 0.7fr 0.7fr 0.5fr 0.6fr 0.6fr" />
        <div className="divide-y min-w-[900px]" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
          {purchases.length === 0 ? (
            <EmptyRow message="No purchases recorded" />
          ) : (
            purchases.map((p) => (
              <div key={p.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200 text-sm" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.9fr 0.7fr 0.7fr 0.7fr 0.5fr 0.6fr 0.6fr", fontFamily: "'DM Sans', sans-serif" }}>
                <div className="flex items-center justify-between gap-2 pr-2">
                  <span className="text-[#2D241E] font-medium">{p.name}</span>
                  <ActionButtons compact onEdit={() => openPurchaseModal(p)} onDelete={() => setDeleteTarget({ type: "purchase", id: p.id, name: p.name })} />
                </div>
                <span className="text-[#2D241E]/60">{p.categoryName}</span>
                <span className="text-[#2D241E]/60 truncate">{p.supplier || "—"}</span>
                <span className="text-[#2D241E]/60">{formatDate(p.purchaseDate)}</span>
                <span className="text-[#2D241E]/60">{formatDate(p.receivedDate)}</span>
                <span className="text-[#2D241E]/60">{formatDate(p.soldDate)}</span>
                <span className="text-[#2D241E]/60">{p.quantitySold}/{p.quantity}</span>
                <span className="text-[#2D241E]">{formatEuro(p.totalCost)}</span>
                <span className="text-[#2D241E]">{p.quantityRemaining} · {formatEuro(p.remainingValue)}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="lg:hidden space-y-3">
        {purchases.length === 0 ? (
          <EmptyCard message="No purchases recorded" />
        ) : (
          purchases.map((p) => (
            <div key={p.id} className="rounded-[20px] p-4" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>{p.name}</p>
                  <p className="text-xs text-[#2D241E]/50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.categoryName} · {p.supplier || "No supplier"}</p>
                </div>
                <ActionButtons onEdit={() => openPurchaseModal(p)} onDelete={() => setDeleteTarget({ type: "purchase", id: p.id, name: p.name })} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#2D241E]/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <span>Bought: {formatDate(p.purchaseDate)}</span>
                <span>Received: {formatDate(p.receivedDate)}</span>
                <span>Sold: {formatDate(p.soldDate)}</span>
                <span>Qty: {p.quantitySold}/{p.quantity}</span>
                <span>Cost: {formatEuro(p.totalCost)}</span>
                <span>Left: {p.quantityRemaining} ({formatEuro(p.remainingValue)})</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const marketingContent = (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{marketing.length} marketing expenses</p>
        <PrimaryButton onClick={() => openMarketingModal(null)}>
          <Plus size={14} />
          <span className="uppercase tracking-widest">Add expense</span>
        </PrimaryButton>
      </div>
      <div className="rounded-[28px] overflow-hidden hidden md:block" style={cardBorder}>
        <TableHeader cols={["Name", "Date", "Amount", "Description", "Actions"]} widths="1.2fr 0.8fr 0.7fr 1.5fr 100px" />
        <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
          {marketing.length === 0 ? (
            <EmptyRow message="No marketing expenses yet" />
          ) : (
            marketing.map((m) => (
              <div key={m.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.7fr 1.5fr 100px", fontFamily: "'DM Sans', sans-serif" }}>
                <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>{m.name}</p>
                <span className="text-sm text-[#2D241E]/60">{formatDate(m.expenseDate)}</span>
                <span className="text-sm text-[#2D241E]">{formatEuro(m.amount)}</span>
                <span className="text-sm text-[#2D241E]/55 truncate">{m.description || "—"}</span>
                <ActionButtons onEdit={() => openMarketingModal(m)} onDelete={() => setDeleteTarget({ type: "marketing", id: m.id, name: m.name })} />
              </div>
            ))
          )}
        </div>
      </div>
      <div className="md:hidden space-y-3">
        {marketing.length === 0 ? (
          <EmptyCard message="No marketing expenses yet" />
        ) : (
          marketing.map((m) => (
            <MobileCard key={m.id} title={m.name} subtitle={`${formatDate(m.expenseDate)} · ${formatEuro(m.amount)}`} extra={m.description || undefined} onEdit={() => openMarketingModal(m)} onDelete={() => setDeleteTarget({ type: "marketing", id: m.id, name: m.name })} />
          ))
        )}
      </div>
    </>
  );

  const reportsContent = (
    <>
      {dateRangeBar}
      <div className="rounded-[20px] p-4 md:p-5 mb-6" style={{ ...cardBorder, backgroundColor: "rgba(45,36,30,0.02)" }}>
        <p className="mb-3" style={labelStyle}>Filter by categories (optional)</p>
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <span className="text-sm text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>No categories</span>
          ) : (
            categories.map((c) => {
              const active = reportCategoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleReportCategory(c.id)}
                  className="px-3 py-1.5 rounded-full text-xs transition-colors duration-200 cursor-pointer"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    backgroundColor: active ? "#2D241E" : "rgba(45,36,30,0.06)",
                    color: active ? "#F5F2ED" : "#2D241E",
                    border: active ? "none" : "1px solid rgba(45,36,30,0.1)",
                  }}
                >
                  {c.name}
                </button>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { key: "orders", label: "Include store orders", checked: includeOrders, set: setIncludeOrders },
            { key: "purchases", label: "Include purchases", checked: includePurchases, set: setIncludePurchases },
            { key: "marketing", label: "Include marketing", checked: includeMarketing, set: setIncludeMarketing },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm text-[#2D241E]/70 cursor-pointer" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} className="rounded accent-[#2D241E] cursor-pointer" />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <PrimaryButton onClick={() => loadReport().catch((e) => setError(e instanceof Error ? e.message : "Failed"))}>
            <BarChart3 size={14} />
            <span className="uppercase tracking-widest">Generate report</span>
          </PrimaryButton>
          <GhostButton onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="uppercase tracking-widest">Download PDF</span>
          </GhostButton>
        </div>
      </div>

      {report && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: easing }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KpiCard label="Revenue" value={formatEuro(report.totalRevenue)} icon={<TrendingUp size={16} />} />
            <KpiCard label="Spent" value={formatEuro(report.totalSpent)} icon={<TrendingDown size={16} />} />
            <KpiCard label="Net" value={formatEuro(report.net)} icon={<BarChart3 size={16} />} />
          </div>

          {report.purchasesByCategory.length > 0 && (
            <ReportSection title="Purchases by category">
              {report.purchasesByCategory.map((cat) => (
                <div key={cat.categoryId} className="mb-4 last:mb-0">
                  <div className="flex flex-wrap justify-between gap-2 mb-2 px-1">
                    <span className="text-[#2D241E] font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{cat.categoryName}</span>
                    <span className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Cost {formatEuro(cat.totalCost)} · Sales {formatEuro(cat.totalSaleRevenue)}
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={cardBorder}>
                    {cat.items.map((item) => (
                      <div key={item.purchaseId} className="px-4 py-3 text-sm border-b last:border-b-0 flex flex-col sm:flex-row sm:justify-between gap-1" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                        <span className="text-[#2D241E]">{item.name} {item.supplier ? `· ${item.supplier}` : ""}</span>
                        <span className="text-[#2D241E]/55">{formatDate(item.purchaseDate)} · {formatEuro(item.totalCost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ReportSection>
          )}

          {report.marketingItems.length > 0 && (
            <ReportSection title="Marketing">
              {report.marketingItems.map((m) => (
                <div key={m.id} className="px-4 py-3 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                  <span className="text-[#2D241E]">{m.name}</span>
                  <span className="text-[#2D241E]/55">{formatDate(m.expenseDate)} · {formatEuro(m.amount)}</span>
                </div>
              ))}
            </ReportSection>
          )}

          {report.remainingInventory.length > 0 && (
            <ReportSection title="Remaining inventory">
              {report.remainingInventory.map((item) => (
                <div key={item.purchaseId} className="px-4 py-3 text-sm border-b last:border-b-0 flex flex-col sm:flex-row sm:justify-between gap-1" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                  <span className="text-[#2D241E]">{item.name} · {item.categoryName}</span>
                  <span className="text-[#2D241E]/55">{item.quantityRemaining} units · {formatEuro(item.remainingValue)}</span>
                </div>
              ))}
            </ReportSection>
          )}
        </motion.div>
      )}
    </>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: easing }}>
      <div className="mb-6">
        <p className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
          Finance
        </p>
        <h2 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 400 }}>
          Accounting
        </h2>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-1 -mx-1 px-1">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-colors duration-200 cursor-pointer flex-shrink-0"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              backgroundColor: section === s.key ? "#2D241E" : "rgba(45,36,30,0.05)",
              color: section === s.key ? "#F5F2ED" : "rgba(45,36,30,0.55)",
            }}
          >
            {s.icon}
            <span className="uppercase tracking-widest">{s.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-[#4A0E0E]" style={{ backgroundColor: "rgba(74,14,14,0.08)", fontFamily: "'DM Sans', sans-serif" }}>
          {error}
        </div>
      )}

      {section === "overview" && overviewContent}
      {section === "categories" && categoriesContent}
      {section === "purchases" && purchasesContent}
      {section === "marketing" && marketingContent}
      {section === "reports" && reportsContent}

      <AnimatePresence>
        {categoryModal.open && (
          <ModalShell title={categoryModal.editing ? "Edit category" : "New category"} onClose={() => setCategoryModal({ open: false, editing: null })}>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} className="mb-4" />
            <FieldLabel>Description</FieldLabel>
            <TextArea value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} className="mb-6" />
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setCategoryModal({ open: false, editing: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void handleSaveCategory()} disabled={loading}>Save</PrimaryButton>
            </div>
          </ModalShell>
        )}

        {purchaseModal.open && (
          <ModalShell title={purchaseModal.editing ? "Edit purchase" : "New purchase"} onClose={() => setPurchaseModal({ open: false, editing: null })}>
            <div className="space-y-4 mb-6">
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  value={purchaseForm.categoryId}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[#2D241E] cursor-pointer"
                  style={inputStyle}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={purchaseForm.name} onChange={(e) => setPurchaseForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Supplier</FieldLabel>
                <TextInput value={purchaseForm.supplier} onChange={(e) => setPurchaseForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Who you purchased from" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Purchase date</FieldLabel>
                  <TextInput type="date" value={purchaseForm.purchaseDate} onChange={(e) => setPurchaseForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Received</FieldLabel>
                  <TextInput type="date" value={purchaseForm.receivedDate} onChange={(e) => setPurchaseForm((f) => ({ ...f, receivedDate: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Sold</FieldLabel>
                  <TextInput type="date" value={purchaseForm.soldDate} onChange={(e) => setPurchaseForm((f) => ({ ...f, soldDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Quantity</FieldLabel>
                  <TextInput type="number" min={0} value={purchaseForm.quantity} onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Qty sold</FieldLabel>
                  <TextInput type="number" min={0} value={purchaseForm.quantitySold} onChange={(e) => setPurchaseForm((f) => ({ ...f, quantitySold: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Unit cost (€)</FieldLabel>
                  <TextInput type="number" min={0} step="0.01" value={purchaseForm.unitCost} onChange={(e) => setPurchaseForm((f) => ({ ...f, unitCost: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Sale price (€)</FieldLabel>
                  <TextInput type="number" min={0} step="0.01" value={purchaseForm.saleUnitPrice} onChange={(e) => setPurchaseForm((f) => ({ ...f, saleUnitPrice: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <TextArea value={purchaseForm.notes} onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setPurchaseModal({ open: false, editing: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void handleSavePurchase()} disabled={loading}>Save</PrimaryButton>
            </div>
          </ModalShell>
        )}

        {marketingModal.open && (
          <ModalShell title={marketingModal.editing ? "Edit expense" : "New marketing expense"} onClose={() => setMarketingModal({ open: false, editing: null })}>
            <div className="space-y-4 mb-6">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={marketingForm.name} onChange={(e) => setMarketingForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Amount (€)</FieldLabel>
                  <TextInput type="number" min={0} step="0.01" value={marketingForm.amount} onChange={(e) => setMarketingForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <TextInput type="date" value={marketingForm.expenseDate} onChange={(e) => setMarketingForm((f) => ({ ...f, expenseDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextArea value={marketingForm.description} onChange={(e) => setMarketingForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setMarketingModal({ open: false, editing: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void handleSaveMarketing()} disabled={loading}>Save</PrimaryButton>
            </div>
          </ModalShell>
        )}

        {deleteTarget && (
          <ModalShell title="Confirm delete" onClose={() => setDeleteTarget(null)}>
            <p className="text-[#2D241E]/70 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setDeleteTarget(null)}>Cancel</GhostButton>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={loading}
                className="px-5 py-2.5 rounded-full text-[#F5F2ED] transition-opacity duration-200 hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem" }}
              >
                Delete
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TableHeader({ cols, widths }: { cols: string[]; widths: string }) {
  return (
    <div
      className="grid px-6 py-4 text-xs tracking-widest uppercase"
      style={{
        gridTemplateColumns: widths,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.12em",
        color: "rgba(45,36,30,0.4)",
        backgroundColor: "rgba(45,36,30,0.03)",
        borderBottom: "1px solid rgba(45,36,30,0.06)",
      }}
    >
      {cols.map((c, i) => (
        <span key={c} className={i === cols.length - 1 ? "text-right" : ""}>{c}</span>
      ))}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>{message}</p>;
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-[20px] p-8 text-center text-[#2D241E]/40" style={cardBorder}>
      <p style={{ fontFamily: "'DM Sans', sans-serif" }}>{message}</p>
    </div>
  );
}

function ActionButtons({ onEdit, onDelete, compact }: { onEdit: () => void; onDelete: () => void; compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "" : "justify-end"} gap-2`}>
      <button type="button" onClick={onEdit} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors duration-200 cursor-pointer" title="Edit">
        <Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} />
      </button>
      <button type="button" onClick={onDelete} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors duration-200 cursor-pointer" title="Delete">
        <Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} />
      </button>
    </div>
  );
}

function MobileCard({ title, subtitle, extra, onEdit, onDelete }: { title: string; subtitle?: string; extra?: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-[20px] p-4" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>{title}</p>
          {subtitle && <p className="text-xs text-[#2D241E]/50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
          {extra && <p className="text-xs text-[#2D241E]/45 mt-1 line-clamp-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{extra}</p>}
        </div>
        <ActionButtons onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] overflow-hidden mb-6" style={cardBorder}>
      <div className="px-6 py-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
        <h4 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 400 }}>{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  );
}
