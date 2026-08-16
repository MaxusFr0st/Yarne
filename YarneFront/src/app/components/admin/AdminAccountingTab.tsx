import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Pencil, Trash2, X, Download, TrendingUp, TrendingDown,
  Package, BarChart3, ShoppingBag, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Lock, FileText, Tag, Truck, Warehouse, ClipboardList,
  Building2, Landmark, CircleDollarSign, Scissors, Factory, Store, RotateCcw,
  Wallet, Camera, BookOpen, Users,
} from "lucide-react";
import {
  fetchAccountingDashboard, fetchSoldOrders,
  fetchMaterials, createMaterial, updateMaterial, deleteMaterial,
  fetchMaterialStock, fetchStockReports, fetchStockReport, createStockReport, voidStockReport,
  fetchAccountingReport, downloadAccountingReportPdf,
  type MaterialDto,
  type MaterialStockDto,
  type SoldOrderLineDto,
  type StockReportSummaryDto,
  type StockReportDetailDto,
  type AccountingDashboardDto,
  type AccountingReportDto,
} from "../../api/accounting";
import { formatPriceCompact } from "../../i18n/format";
import { formatRollBreakdown } from "./rollTracking";
import { AdminProcurementView } from "./AdminProcurementView";
import { AdminProductAccountingView } from "./AdminProductAccountingView";
import { AdminProductionView } from "./AdminProductionView";
import { AdminFinishedStockView } from "./AdminFinishedStockView";
import { AdminSalesView } from "./AdminSalesView";
import { AdminReturnsView } from "./AdminReturnsView";
import { AdminCustomersView } from "./AdminCustomersView";
import { AdminOperatingExpensesView } from "./AdminOperatingExpensesView";
import { AdminAccountingReportsView } from "./AdminAccountingReportsView";

// ─── Types ────────────────────────────────────────────────────────────────────
type AccountingTab =
  | "overview" | "sold" | "suppliers" | "materials" | "purchase-orders" | "currency-rates"
  | "stock" | "stock-reports" | "reports"
  | "products" | "production" | "channels" | "sales" | "customers" | "returns"
  | "operating-expenses" | "quick-expense" | "ledger";

const ACCOUNTING_TAB_KEYS: AccountingTab[] = [
  "overview", "sold", "suppliers", "materials", "purchase-orders", "currency-rates",
  "stock", "stock-reports", "reports",
  "products", "production", "channels", "sales", "customers", "returns",
  "operating-expenses", "quick-expense", "ledger",
];

function readSectionFromUrl(): AccountingTab | null {
  if (typeof window === "undefined") return null;
  const section = new URLSearchParams(window.location.search).get("section");
  if (section && (ACCOUNTING_TAB_KEYS as string[]).includes(section)) {
    return section as AccountingTab;
  }
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const easing = [0.25, 0.1, 0.25, 1] as const;
const cardBorder = { border: "1px solid rgba(45,36,30,0.08)" } as const;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function monthStartIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMoney(value: number): string {
  // Accounting UI is admin-only; standardize on hryvnia compact formatting.
  return formatPriceCompact(value, "uk");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

// ─── UI Primitives ────────────────────────────────────────────────────────────
function PrimaryButton({
  children, onClick, disabled,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[#F5F2ED] transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]"
      style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em" }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children, onClick, disabled,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full transition-colors duration-200 hover:bg-[#2D241E]/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
      style={{ ...cardBorder, fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", color: "#2D241E" }}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: string;
}) {
  return (
    <div
      className="rounded-[20px] p-5 md:p-6 transition-colors duration-200 hover:bg-white/55"
      style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span style={labelStyle}>{label}</span>
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accent ?? "rgba(45,36,30,0.06)", color: "#2D241E" }}
        >
          {icon}
        </span>
      </div>
      <p
        className="text-[#2D241E] leading-tight"
        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.75rem", fontWeight: 500 }}
      >
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

function ModalShell({
  title, eyebrow, onClose, children, wide,
}: {
  title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      style={{ overscrollBehavior: "contain" }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        style={{ backgroundColor: "rgba(45,36,30,0.48)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
        onClick={onClose}
        aria-label="Close"
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: easing }}
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[min(92dvh,720px)] overflow-y-auto overscroll-contain rounded-t-[28px] sm:rounded-[32px] p-6 md:p-8`}
        style={{ backgroundColor: "#F5F2ED", ...cardBorder }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
              >
                {eyebrow}
              </p>
            ) : null}
            <h3
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 flex-shrink-0"
            aria-label="Close"
          >
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

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full px-4 py-2.5 rounded-xl text-[#2D241E] text-sm outline-none focus:ring-2 focus:ring-[#2D241E]/15 transition-shadow duration-200 cursor-pointer ${rest.className ?? ""}`}
      style={inputStyle}
    >
      {children}
    </select>
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

function TableHeader({ cols, widths }: { cols: string[]; widths: string }) {
  return (
    <div
      className="grid px-6 py-4 text-xs uppercase"
      style={{
        gridTemplateColumns: widths,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.12em",
        color: "rgba(45,36,30,0.4)",
        backgroundColor: "rgba(45,36,30,0.03)",
        borderBottom: "1px solid rgba(45,36,30,0.06)",
      }}
    >
      {cols.map((c) => <span key={c}>{c}</span>)}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {message}
    </p>
  );
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
    <div className={`flex items-center ${compact ? "" : "justify-end"} gap-1`}>
      <button
        type="button"
        onClick={onEdit}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
        title="Edit"
        aria-label="Edit"
      >
        <Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
        title="Void"
        aria-label="Void"
      >
        <Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} />
      </button>
    </div>
  );
}

function MobileCard({
  title, subtitle, extra, onEdit, onDelete,
}: {
  title: string; subtitle?: string; extra?: string; onEdit: () => void; onDelete: () => void;
}) {
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

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TABS: { key: AccountingTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview",      label: "Overview",      icon: <BarChart3 size={14} /> },
  { key: "sold",          label: "Sold",          icon: <ShoppingBag size={14} /> },
  { key: "suppliers",     label: "Suppliers",     icon: <Building2 size={14} /> },
  { key: "materials",     label: "Materials",     icon: <Package size={14} /> },
  { key: "purchase-orders", label: "Purchases",   icon: <Landmark size={14} /> },
  { key: "currency-rates", label: "Rates",        icon: <CircleDollarSign size={14} /> },
  { key: "products",      label: "Products",      icon: <Scissors size={14} /> },
  { key: "production",    label: "Production",    icon: <Factory size={14} /> },
  { key: "channels",      label: "Channels",      icon: <Store size={14} /> },
  { key: "sales",         label: "Sales",         icon: <ShoppingBag size={14} /> },
  { key: "customers",     label: "Customers",     icon: <Users size={14} /> },
  { key: "returns",       label: "Returns",       icon: <RotateCcw size={14} /> },
  { key: "operating-expenses", label: "OpEx",     icon: <Wallet size={14} /> },
  { key: "quick-expense", label: "Quick OpEx",    icon: <Camera size={14} /> },
  { key: "ledger",        label: "Ledger",        icon: <BookOpen size={14} /> },
  { key: "stock",         label: "Stock",         icon: <Warehouse size={14} /> },
  { key: "stock-reports", label: "Stock Reports", icon: <ClipboardList size={14} /> },
  { key: "reports",       label: "Reports",       icon: <FileText size={14} /> },
];

// ─── Main export ─────────────────────────────────────────────────────────────
export function AdminAccountingTab() {
  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab, setTabState] = useState<AccountingTab>(() => readSectionFromUrl() ?? "overview");

  const setTab = useCallback((next: AccountingTab) => {
    setTabState(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("section", next);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Ignore URL sync failures in non-browser contexts.
    }
  }, []);

  // ── Global date range (overview / sold / expenses) ────────────────────────
  const [dateFrom, setDateFrom] = useState(monthStartIso);
  const [dateTo, setDateTo] = useState(todayIso);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState<AccountingDashboardDto | null>(null);
  const [soldOrders, setSoldOrders] = useState<SoldOrderLineDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [stock, setStock] = useState<MaterialStockDto[]>([]);
  const [hideZeroStockMaterials, setHideZeroStockMaterials] = useState(false);
  const [stockReports, setStockReports] = useState<StockReportSummaryDto[]>([]);
  const [report, setReport] = useState<AccountingReportDto | null>(null);

  // ── Status ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Report params ──────────────────────────────────────────────────────────
  const [reportFrom, setReportFrom] = useState(monthStartIso);
  const [reportTo, setReportTo] = useState(todayIso);
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includeImports, setIncludeImports] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeStock, setIncludeStock] = useState(true);

  // ── Material modal ────────────────────────────────────────────────────────
  const [matModal, setMatModal] = useState<{ open: boolean; editing: MaterialDto | null }>({ open: false, editing: null });
  const [matForm, setMatForm] = useState({ name: "", unit: "pcs", sku: "", category: "", reorderThreshold: "0", description: "", trackByItem: false, defaultLengthPerItem: "" });

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "material" | "stock-report"; id: number; name: string;
  } | null>(null);

  // ── Stock report expansion ────────────────────────────────────────────────
  const [expandedReports, setExpandedReports] = useState<Record<number, StockReportDetailDto | null>>({});

  // ── Stock report create ───────────────────────────────────────────────────
  const [srModal, setSrModal] = useState(false);
  const [srForm, setSrForm] = useState({ label: "", notes: "" });

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadMaterials = useCallback(async () => {
    const data = await fetchMaterials();
    setMaterials(data);
    return data;
  }, []);

  const loadForTab = useCallback(
    async (t: AccountingTab, from: string, to: string) => {
      const selfManaged: AccountingTab[] = [
        "suppliers", "purchase-orders", "currency-rates",
        "products", "production", "channels", "sales", "returns",
        "operating-expenses", "quick-expense", "ledger",
      ];
      if (selfManaged.includes(t)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (t === "overview") {
          const [dash] = await Promise.all([
            fetchAccountingDashboard(from, to),
            loadMaterials(),
          ]);
          setDashboard(dash);
        } else if (t === "sold") {
          const data = await fetchSoldOrders(from, to);
          setSoldOrders(data);
        } else if (t === "materials") {
          await loadMaterials();
        } else if (t === "stock") {
          const data = await fetchMaterialStock();
          setStock(data);
        } else if (t === "stock-reports") {
          const data = await fetchStockReports();
          setStockReports(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [loadMaterials],
  );

  useEffect(() => {
    void loadForTab(tab, dateFrom, dateTo);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "overview" || tab === "sold") {
      void loadForTab(tab, dateFrom, dateTo);
    }
  }, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Material handlers ────────────────────────────────────────────────────
  const openMatModal = (editing: MaterialDto | null) => {
    setMatForm({
      name: editing?.name ?? "",
      unit: editing?.unit ?? "pcs",
      sku: editing?.sku ?? "",
      category: editing?.category ?? "",
      reorderThreshold: String(editing?.reorderThreshold ?? 0),
      description: editing?.description ?? "",
      trackByItem: editing?.trackByItem ?? false,
      defaultLengthPerItem: editing?.defaultLengthPerItem != null ? String(editing.defaultLengthPerItem) : "",
    });
    setMatModal({ open: true, editing });
  };

  const saveMaterial = async () => {
    if (!matForm.name.trim()) return;
    setModalLoading(true);
    setError(null);
    try {
      const body = {
        name: matForm.name.trim(),
        unit: matForm.unit.trim() || "pcs",
        sku: matForm.sku.trim() || null,
        category: matForm.category.trim() || null,
        reorderThreshold: Math.max(0, Number(matForm.reorderThreshold) || 0),
        description: matForm.description.trim() || null,
        trackByItem: matForm.trackByItem,
        defaultLengthPerItem: matForm.trackByItem && matForm.defaultLengthPerItem.trim()
          ? Number(matForm.defaultLengthPerItem)
          : null,
      };
      if (matModal.editing) {
        await updateMaterial(matModal.editing.id, body);
      } else {
        await createMaterial(body);
      }
      setMatModal({ open: false, editing: null });
      await loadMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    setError(null);
    try {
      if (deleteTarget.type === "stock-report") {
        await voidStockReport(deleteTarget.id);
        setDeleteTarget(null);
        setExpandedReports((prev) => {
          const next = { ...prev };
          delete next[deleteTarget.id];
          return next;
        });
        setStockReports(await fetchStockReports());
      } else {
        await deleteMaterial(deleteTarget.id);
        setDeleteTarget(null);
        await loadMaterials();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Void failed");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Stock report handlers ────────────────────────────────────────────────
  const toggleExpandReport = async (id: number) => {
    if (id in expandedReports) {
      setExpandedReports((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setExpandedReports((prev) => ({ ...prev, [id]: null }));
    try {
      const detail = await fetchStockReport(id);
      setExpandedReports((prev) => ({ ...prev, [id]: detail }));
    } catch {
      setExpandedReports((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleCreateStockReport = async () => {
    setModalLoading(true);
    setError(null);
    try {
      await createStockReport({ label: srForm.label.trim() || null, notes: srForm.notes.trim() || null });
      setSrModal(false);
      setSrForm({ label: "", notes: "" });
      const data = await fetchStockReports();
      setStockReports(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create stock report");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Report handlers ──────────────────────────────────────────────────────
  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAccountingReport({
        from: reportFrom, to: reportTo,
        includeOrders, includeImports, includeExpenses, includeStock,
      });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      await downloadAccountingReportPdf({
        from: reportFrom, to: reportTo,
        includeOrders, includeImports, includeExpenses, includeStock,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Shared UI pieces ─────────────────────────────────────────────────────
  const dateRangeBar = (
    <div
      className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 mb-6 p-4 md:p-5 rounded-[20px]"
      style={{ ...cardBorder, backgroundColor: "rgba(45,36,30,0.02)" }}
    >
      <div className="flex-1 min-w-[140px]">
        <FieldLabel>From</FieldLabel>
        <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="flex-1 min-w-[140px]">
        <FieldLabel>To</FieldLabel>
        <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
      <div className="flex gap-2 sm:pb-0.5">
        <GhostButton onClick={() => void loadForTab(tab, dateFrom, dateTo)} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span className="uppercase tracking-widest">Refresh</span>
        </GhostButton>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: easing }}
    >
      {/* Header */}
      <div className="mb-6">
        <p className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
          Finance
        </p>
        <h2 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 400 }}>
          Accounting
        </h2>
      </div>

      {/* Pill navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              backgroundColor: tab === t.key ? "#2D241E" : "rgba(45,36,30,0.05)",
              color: tab === t.key ? "#F5F2ED" : "rgba(45,36,30,0.55)",
            }}
          >
            {t.icon}
            <span className="uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm text-[#4A0E0E]"
          style={{ backgroundColor: "rgba(74,14,14,0.08)", fontFamily: "'DM Sans', sans-serif" }}
        >
          {error}
        </div>
      )}

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <>
          {dateRangeBar}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
            <KpiCard
              label="Revenue (sold)"
              value={formatMoney(dashboard?.soldRevenue ?? 0)}
              sub={`${dashboard?.totalOrdersSold ?? 0} orders received`}
              icon={<TrendingUp size={16} />}
              accent="rgba(34,120,80,0.12)"
            />
            <KpiCard
              label="Import spend"
              value={formatMoney(dashboard?.importSpend ?? 0)}
              icon={<Truck size={16} />}
            />
            <KpiCard
              label="Expense spend"
              value={formatMoney(dashboard?.expenseSpend ?? 0)}
              icon={<Tag size={16} />}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard
              label="Net (revenue − spend)"
              value={formatMoney(dashboard?.net ?? 0)}
              sub={(dashboard?.net ?? 0) >= 0 ? "Positive period" : "Negative period"}
              icon={(dashboard?.net ?? 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              accent={(dashboard?.net ?? 0) >= 0 ? "rgba(34,120,80,0.12)" : "rgba(74,14,14,0.1)"}
            />
            <KpiCard
              label="Material stock value"
              value={formatMoney(dashboard?.materialStockValue ?? 0)}
              icon={<Package size={16} />}
            />
            <KpiCard
              label="Orders sold"
              value={String(dashboard?.totalOrdersSold ?? 0)}
              sub="Store orders in period"
              icon={<ShoppingBag size={16} />}
            />
          </div>
        </>
      )}

      {/* ── Sold ──────────────────────────────────────────────────────────── */}
      {tab === "sold" && (
        <>
          {dateRangeBar}
          <div className="rounded-[28px] overflow-x-auto hidden md:block" style={cardBorder}>
            <TableHeader cols={["Order ID", "Date", "Customer", "Status", "Total"]} widths="0.6fr 1fr 1.5fr 0.8fr 0.8fr" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {soldOrders.length === 0 ? (
                <EmptyRow message="No received orders in this period" />
              ) : (
                soldOrders.map((o) => (
                  <div
                    key={o.orderId}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.03] transition-colors duration-200 text-sm"
                    style={{ gridTemplateColumns: "0.6fr 1fr 1.5fr 0.8fr 0.8fr", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-[#2D241E]/60">#{o.orderId}</span>
                    <span className="text-[#2D241E]/60">{formatDate(o.orderDate)}</span>
                    <span className="text-[#2D241E]">{o.customerName}</span>
                    <span className="text-[#2D241E]/60 capitalize">{o.status}</span>
                    <span className="text-[#2D241E] font-medium">{formatMoney(o.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {soldOrders.length === 0 ? (
              <EmptyCard message="No received orders in this period" />
            ) : (
              soldOrders.map((o) => (
                <div key={o.orderId} className="rounded-[20px] p-4" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{o.customerName}</p>
                      <p className="text-xs text-[#2D241E]/50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        #{o.orderId} · {formatDate(o.orderDate)} · {o.status}
                      </p>
                    </div>
                    <span className="text-[#2D241E] font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(o.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Phase 2 procurement views ───────────────────────────────────── */}
      {(tab === "suppliers" || tab === "purchase-orders" || tab === "currency-rates") && (
        <AdminProcurementView view={tab} />
      )}

      {/* ── Phases 3–9 accounting domain views ──────────────────────────── */}
      {tab === "products" && <AdminProductAccountingView />}
      {tab === "production" && <AdminProductionView />}
      {tab === "channels" && <AdminSalesView mode="channels" />}
      {tab === "sales" && <AdminSalesView mode="sales" />}
      {tab === "customers" && <AdminCustomersView />}
      {tab === "returns" && <AdminReturnsView />}
      {tab === "operating-expenses" && <AdminOperatingExpensesView mode="list" />}
      {tab === "quick-expense" && <AdminOperatingExpensesView mode="quick" />}
      {tab === "ledger" && <AdminAccountingReportsView />}

      {/* ── Materials ─────────────────────────────────────────────────────── */}
      {tab === "materials" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{materials.length} materials</p>
            <PrimaryButton onClick={() => openMatModal(null)}>
              <Plus size={14} />
              <span className="uppercase tracking-widest">Add material</span>
            </PrimaryButton>
          </div>
          <div className="rounded-[28px] overflow-hidden hidden md:block" style={cardBorder}>
            <TableHeader cols={["Name", "Category", "SKU", "Unit", "Reorder at", "Active", "Actions"]} widths="1.5fr 1fr 0.8fr 0.55fr 0.75fr 0.55fr 100px" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {materials.length === 0 ? (
                <EmptyRow message="No materials yet" />
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.03] transition-colors duration-200"
                    style={{ gridTemplateColumns: "1.5fr 1fr 0.8fr 0.55fr 0.75fr 0.55fr 100px", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <div>
                      <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>{m.name}</p>
                      {m.description && <p className="text-xs text-[#2D241E]/45 mt-0.5">{m.description}</p>}
                    </div>
                    <span className="text-sm text-[#2D241E]/60">{m.category || "—"}</span>
                    <span className="text-sm text-[#2D241E]/60">{m.sku || "—"}</span>
                    <span className="text-sm text-[#2D241E]/60">{m.unit}</span>
                    <span className="text-sm text-[#2D241E]/60">{m.reorderThreshold} {m.unit}</span>
                    <span className="text-sm text-[#2D241E]/60">{m.isActive ? "Yes" : "No"}</span>
                    <ActionButtons onEdit={() => openMatModal(m)} onDelete={() => setDeleteTarget({ type: "material", id: m.id, name: m.name })} />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {materials.length === 0 ? (
              <EmptyCard message="No materials yet" />
            ) : (
              materials.map((m) => (
                <MobileCard
                  key={m.id}
                  title={m.name}
                  subtitle={`${m.category ? `${m.category} · ` : ""}${m.unit}${m.sku ? ` · SKU: ${m.sku}` : ""} · reorder at ${m.reorderThreshold}`}
                  extra={m.description || undefined}
                  onEdit={() => openMatModal(m)}
                  onDelete={() => setDeleteTarget({ type: "material", id: m.id, name: m.name })}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Stock ─────────────────────────────────────────────────────────── */}
      {tab === "stock" && (
        <>
          <section className="mb-10">
            <p className="mb-3 text-[0.68rem] uppercase tracking-[0.14em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Product stock
            </p>
            <AdminFinishedStockView />
          </section>

          <section>
            <p className="mb-3 text-[0.68rem] uppercase tracking-[0.14em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Material stock
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-4">
                <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {(hideZeroStockMaterials ? stock.filter((s) => s.qtyOnHand !== 0) : stock).length} materials tracked
                </p>
                <label className="flex items-center gap-2 text-sm text-[#2D241E]/65 cursor-pointer" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer"
                    checked={hideZeroStockMaterials}
                    onChange={(e) => setHideZeroStockMaterials(e.target.checked)}
                  />
                  Hide zero-stock materials
                </label>
              </div>
              <GhostButton onClick={() => void fetchMaterialStock().then(setStock).catch((e) => setError(e instanceof Error ? e.message : "Failed"))} disabled={loading}>
                <RefreshCw size={14} />
                <span className="uppercase tracking-widest">Refresh</span>
              </GhostButton>
            </div>
            {(() => {
              const visibleStock = hideZeroStockMaterials ? stock.filter((s) => s.qtyOnHand !== 0) : stock;
              return (
                <>
                  <div className="rounded-[28px] overflow-x-auto hidden md:block" style={cardBorder}>
                    <TableHeader cols={["Material", "SKU", "Unit", "Imported", "Used", "On hand", "Stock value"]} widths="1.5fr 0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 1.0fr" />
                    <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                      {visibleStock.length === 0 ? (
                        <EmptyRow message="No stock data yet" />
                      ) : (
                        visibleStock.map((s) => {
                          const isNeg = s.qtyOnHand < 0;
                          const breakdown = s.trackByItem
                            ? formatRollBreakdown(s.wholeItemsRemaining, s.looseRemainder, s.qtyOnHand, s.unit)
                            : null;
                          return (
                            <div
                              key={s.materialId}
                              className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.03] transition-colors duration-200 text-sm"
                              style={{ gridTemplateColumns: "1.5fr 0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 1.0fr", fontFamily: "'DM Sans', sans-serif" }}
                            >
                              <span className="text-[#2D241E] font-medium">{s.name}</span>
                              <span className="text-[#2D241E]/60">{s.sku || "—"}</span>
                              <span className="text-[#2D241E]/60">{s.unit}</span>
                              <span className="text-[#2D241E]/60">{s.qtyImported}</span>
                              <span className="text-[#2D241E]/60">{s.qtyUsed}</span>
                              <span style={{ color: isNeg ? "#4A0E0E" : "#2D241E", fontWeight: isNeg ? 500 : undefined }}>
                                {s.qtyOnHand}
                                {breakdown && (
                                  <span className="block text-xs text-[#2D241E]/50 font-normal">{breakdown}</span>
                                )}
                              </span>
                              <span style={{ color: isNeg ? "#4A0E0E" : "#2D241E", fontWeight: 500 }}>{formatMoney(s.totalStockValue)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="md:hidden space-y-3">
                    {visibleStock.length === 0 ? (
                      <EmptyCard message="No stock data yet" />
                    ) : (
                      visibleStock.map((s) => {
                        const isNeg = s.qtyOnHand < 0;
                        const breakdown = s.trackByItem
                          ? formatRollBreakdown(s.wholeItemsRemaining, s.looseRemainder, s.qtyOnHand, s.unit)
                          : null;
                        return (
                          <div key={s.materialId} className="rounded-[20px] p-4" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>{s.name}</p>
                                <p className="text-xs text-[#2D241E]/50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.unit}{s.sku ? ` · ${s.sku}` : ""}</p>
                              </div>
                              <span className="font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: isNeg ? "#4A0E0E" : "#2D241E" }}>{formatMoney(s.totalStockValue)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              <span className="text-[#2D241E]/65">Imported: {s.qtyImported}</span>
                              <span className="text-[#2D241E]/65">Used: {s.qtyUsed}</span>
                              <span style={{ color: isNeg ? "#4A0E0E" : "rgba(45,36,30,0.65)", fontWeight: isNeg ? 500 : undefined }}>On hand: {s.qtyOnHand}</span>
                            </div>
                            {breakdown && (
                              <p className="text-xs text-[#2D241E]/50 mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{breakdown}</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </section>
        </>
      )}

      {/* ── Stock Reports ─────────────────────────────────────────────────── */}
      {tab === "stock-reports" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{stockReports.length} reports</p>
            <PrimaryButton onClick={() => { setSrForm({ label: "", notes: "" }); setSrModal(true); }}>
              <Lock size={14} />
              <span className="uppercase tracking-widest">Verify &amp; lock</span>
            </PrimaryButton>
          </div>
          <div className="space-y-3">
            {stockReports.length === 0 ? (
              <EmptyCard message="No stock reports yet. Lock a snapshot to track stock history." />
            ) : (
              stockReports.map((sr) => {
                const expanded = sr.id in expandedReports;
                const detail = expandedReports[sr.id];
                return (
                  <div key={sr.id} className="rounded-[20px] overflow-hidden" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
                    <div className="flex items-start gap-4 p-4 md:p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>
                            {sr.label || formatDate(sr.snapshotDate)}
                          </p>
                          {sr.isLocked && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(45,36,30,0.08)", fontFamily: "'DM Sans', sans-serif", color: "#2D241E" }}>
                              <Lock size={10} /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#2D241E]/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {formatDate(sr.snapshotDate)} · {sr.lineCount} materials · {formatMoney(sr.totalStockValue)}
                        </p>
                        {sr.notes && <p className="text-xs text-[#2D241E]/45 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{sr.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({
                            type: "stock-report",
                            id: sr.id,
                            name: sr.label || formatDate(sr.snapshotDate),
                          })}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                          title="Void"
                          aria-label={`Void stock report ${sr.id}`}
                        >
                          <Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleExpandReport(sr.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors cursor-pointer flex-shrink-0"
                          aria-label={expanded ? "Collapse stock report" : "Expand stock report"}
                        >
                          {expanded ? <ChevronUp size={16} style={{ color: "#2D241E", opacity: 0.5 }} /> : <ChevronDown size={16} style={{ color: "#2D241E", opacity: 0.5 }} />}
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ borderTop: "1px solid rgba(45,36,30,0.06)" }}>
                        {detail === null ? (
                          <div className="flex justify-center py-6">
                            <Loader2 size={20} className="animate-spin" style={{ color: "#2D241E", opacity: 0.4 }} />
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              <thead>
                                <tr style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                                  {["Material", "Unit", "Imported", "Used", "On hand", "Avg cost", "Value"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-normal" style={{ color: "rgba(45,36,30,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                                {detail.lines.map((ln) => (
                                  <tr key={ln.id} className="hover:bg-[#2D241E]/[0.02] transition-colors">
                                    <td className="px-4 py-3 text-[#2D241E]">{ln.materialName}</td>
                                    <td className="px-4 py-3 text-[#2D241E]/60">{ln.materialUnit}</td>
                                    <td className="px-4 py-3 text-[#2D241E]/60">{ln.qtyImported}</td>
                                    <td className="px-4 py-3 text-[#2D241E]/60">{ln.qtyUsed}</td>
                                    <td className="px-4 py-3 text-[#2D241E]">{ln.qtyOnHand}</td>
                                    <td className="px-4 py-3 text-[#2D241E]/60">{formatMoney(ln.avgUnitCost)}</td>
                                    <td className="px-4 py-3 text-[#2D241E] font-medium">{formatMoney(ln.totalValue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Reports ───────────────────────────────────────────────────────── */}
      {tab === "reports" && (
        <>
          <div
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 mb-6 p-4 md:p-5 rounded-[20px]"
            style={{ ...cardBorder, backgroundColor: "rgba(45,36,30,0.02)" }}
          >
            <div className="flex-1 min-w-[140px]">
              <FieldLabel>From</FieldLabel>
              <TextInput type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[140px]">
              <FieldLabel>To</FieldLabel>
              <TextInput type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-6 px-1">
            {[
              { key: "orders", label: "Include orders", checked: includeOrders, set: setIncludeOrders },
              { key: "imports", label: "Include imports", checked: includeImports, set: setIncludeImports },
              { key: "expenses", label: "Include expenses", checked: includeExpenses, set: setIncludeExpenses },
              { key: "stock", label: "Include stock snapshot", checked: includeStock, set: setIncludeStock },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-sm text-[#2D241E]/70 cursor-pointer" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} className="rounded accent-[#2D241E] cursor-pointer" />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <PrimaryButton onClick={() => void loadReport()} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
              <span className="uppercase tracking-widest">Generate preview</span>
            </PrimaryButton>
            <GhostButton onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="uppercase tracking-widest">Download PDF</span>
            </GhostButton>
          </div>

          {report && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: easing }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Revenue" value={formatMoney(report.soldRevenue)} icon={<TrendingUp size={16} />} accent="rgba(34,120,80,0.12)" />
                <KpiCard label="Import spend" value={formatMoney(report.importSpend)} icon={<Truck size={16} />} />
                <KpiCard label="Expense spend" value={formatMoney(report.expenseSpend)} icon={<Tag size={16} />} />
                <KpiCard label="Net" value={formatMoney(report.net)} icon={report.net >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} accent={report.net >= 0 ? "rgba(34,120,80,0.12)" : "rgba(74,14,14,0.1)"} />
              </div>

              {report.orders && report.orders.length > 0 && (
                <ReportSection title="Orders">
                  {report.orders.map((o) => (
                    <div key={o.orderId} className="px-4 py-3 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="text-[#2D241E]">#{o.orderId} — {o.customerName}</span>
                      <span className="text-[#2D241E]/55">{formatDate(o.orderDate)} · {formatMoney(o.total)}</span>
                    </div>
                  ))}
                </ReportSection>
              )}

              {report.importTransactions && report.importTransactions.length > 0 && (
                <ReportSection title="Imports">
                  {report.importTransactions.map((imp) => (
                    <div key={imp.id} className="px-4 py-3 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="text-[#2D241E]">{imp.supplier || `Import #${imp.id}`}{imp.invoiceRef ? ` · ${imp.invoiceRef}` : ""}</span>
                      <span className="text-[#2D241E]/55">{formatDate(imp.transactionDate)} · {formatMoney(imp.totalAmount)}</span>
                    </div>
                  ))}
                </ReportSection>
              )}

              {report.expensesByCategory && report.expensesByCategory.length > 0 && (
                <ReportSection title="Expenses by category">
                  {report.expensesByCategory.map((cat) => (
                    <div key={cat.category} className="mb-4 last:mb-0 px-4 pt-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>{cat.category}</span>
                        <span className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(cat.totalAmount)}</span>
                      </div>
                      <div className="rounded-xl overflow-hidden mb-3" style={cardBorder}>
                        {cat.items.map((item) => (
                          <div key={item.id} className="px-3 py-2.5 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                            <span className="text-[#2D241E]">{item.name}</span>
                            <span className="text-[#2D241E]/55">{formatDate(item.expenseDate)} · {formatMoney(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </ReportSection>
              )}

              {report.stockSnapshot && report.stockSnapshot.length > 0 && (
                <ReportSection title="Stock snapshot">
                  {report.stockSnapshot.map((s) => (
                    <div key={s.materialId} className="px-4 py-3 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="text-[#2D241E]">{s.materialName} ({s.materialUnit})</span>
                      <span className="text-[#2D241E]/55">{s.qtyOnHand} on hand · {formatMoney(s.totalValue)}</span>
                    </div>
                  ))}
                </ReportSection>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Material modal */}
        {matModal.open && (
          <ModalShell title={matModal.editing ? "Edit material" : "New material"} onClose={() => setMatModal({ open: false, editing: null })}>
            <div className="space-y-4 mb-6">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={matForm.name} onChange={(e) => setMatForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Merino wool yarn" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Unit</FieldLabel>
                  <TextInput value={matForm.unit} onChange={(e) => setMatForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. g, m, pcs" />
                </div>
                <div>
                  <FieldLabel>SKU (optional)</FieldLabel>
                  <TextInput value={matForm.sku} onChange={(e) => setMatForm((f) => ({ ...f, sku: e.target.value }))} placeholder="e.g. YRN-001" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Category (optional)</FieldLabel>
                  <TextInput value={matForm.category} onChange={(e) => setMatForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Yarn, Packaging" />
                </div>
                <div>
                  <FieldLabel>Reorder threshold</FieldLabel>
                  <TextInput type="number" min={0} step="0.001" value={matForm.reorderThreshold} onChange={(e) => setMatForm((f) => ({ ...f, reorderThreshold: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Description (optional)</FieldLabel>
                <TextArea value={matForm.description} onChange={(e) => setMatForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-[#2D241E]/70 cursor-pointer" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer rounded accent-[#2D241E]"
                    checked={matForm.trackByItem}
                    onChange={(e) => setMatForm((f) => ({ ...f, trackByItem: e.target.checked }))}
                  />
                  Track by roll / discrete item
                </label>
                {matForm.trackByItem && (
                  <div className="mt-2">
                    <FieldLabel>{`Default length per roll (in ${matForm.unit.trim() || "unit"})`}</FieldLabel>
                    <TextInput
                      type="number"
                      min={0}
                      step="0.0001"
                      value={matForm.defaultLengthPerItem}
                      onChange={(e) => setMatForm((f) => ({ ...f, defaultLengthPerItem: e.target.value }))}
                      placeholder="e.g. 120"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setMatModal({ open: false, editing: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void saveMaterial()} disabled={modalLoading || !matForm.name.trim()}>
                {modalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </PrimaryButton>
            </div>
          </ModalShell>
        )}

        {/* Stock report create modal */}
        {srModal && (
          <ModalShell title="Verify & lock stock report" onClose={() => setSrModal(false)}>
            <p className="text-sm text-[#2D241E]/60 mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              This will snapshot the current stock levels and lock the report. Locked snapshots can later be voided if needed.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <FieldLabel>Label (optional)</FieldLabel>
                <TextInput value={srForm.label} onChange={(e) => setSrForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. June 2026 stock check" />
              </div>
              <div>
                <FieldLabel>Notes (optional)</FieldLabel>
                <TextArea value={srForm.notes} onChange={(e) => setSrForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setSrModal(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void handleCreateStockReport()} disabled={modalLoading}>
                {modalLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                <span className="uppercase tracking-widest">Lock snapshot</span>
              </PrimaryButton>
            </div>
          </ModalShell>
        )}

        {/* Void confirm */}
        {deleteTarget && (
          <ModalShell title="Confirm void" onClose={() => setDeleteTarget(null)}>
            <p className="text-[#2D241E]/70 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Void <strong>{deleteTarget.name}</strong>? The record will leave active accounting views and this cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setDeleteTarget(null)}>Cancel</GhostButton>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={modalLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[#F5F2ED] transition-opacity duration-200 hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem" }}
              >
                {modalLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Void record
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────
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
