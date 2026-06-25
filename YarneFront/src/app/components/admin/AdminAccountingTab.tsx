import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Pencil, Trash2, X, Download, TrendingUp, TrendingDown,
  Package, BarChart3, ShoppingBag, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Lock, FileText, Tag, Truck, Layers, Warehouse, ClipboardList,
} from "lucide-react";
import {
  fetchAccountingDashboard, fetchSoldOrders,
  fetchMaterials, createMaterial, updateMaterial, deleteMaterial,
  fetchImports, fetchImport, createImport, updateImport, deleteImport,
  fetchExpenses, fetchExpenseCategories, createExpense, updateExpense, deleteExpense,
  fetchUsageRecords, createUsage, updateUsage, deleteUsage,
  fetchMaterialStock, fetchStockReports, fetchStockReport, createStockReport,
  fetchAccountingReport, downloadAccountingReportPdf,
  DEFAULT_EXPENSE_CATEGORIES,
  type MaterialDto,
  type MaterialStockDto,
  type ImportTransactionSummaryDto,
  type ExpenseDto,
  type MaterialUsageRecordDto,
  type SoldOrderLineDto,
  type StockReportSummaryDto,
  type StockReportDetailDto,
  type AccountingDashboardDto,
  type AccountingReportDto,
} from "../../api/accounting";

// ─── Types ────────────────────────────────────────────────────────────────────
type AccountingTab =
  | "overview" | "sold" | "materials" | "imports"
  | "usage" | "expenses" | "stock" | "stock-reports" | "reports";

interface ImportLine {
  materialId: number;
  quantity: string;
  unitPrice: string;
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
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[#F5F2ED] transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
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
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full transition-colors duration-200 hover:bg-[#2D241E]/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
      className="rounded-[20px] p-5 md:p-6 transition-colors duration-200"
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
  title, onClose, children, wide,
}: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-[#2D241E]/40 cursor-pointer" onClick={onClose} aria-label="Close" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: easing }}
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6 md:p-8`}
        style={{ backgroundColor: "#F5F2ED", ...cardBorder }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-[#2D241E]"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors cursor-pointer"
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
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors duration-200 cursor-pointer"
        title="Edit"
      >
        <Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors duration-200 cursor-pointer"
        title="Delete"
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
  { key: "materials",     label: "Materials",     icon: <Package size={14} /> },
  { key: "imports",       label: "Imports",       icon: <Truck size={14} /> },
  { key: "usage",         label: "Usage",         icon: <Layers size={14} /> },
  { key: "expenses",      label: "Expenses",      icon: <Tag size={14} /> },
  { key: "stock",         label: "Stock",         icon: <Warehouse size={14} /> },
  { key: "stock-reports", label: "Stock Reports", icon: <ClipboardList size={14} /> },
  { key: "reports",       label: "Reports",       icon: <FileText size={14} /> },
];

// ─── Main export ─────────────────────────────────────────────────────────────
export function AdminAccountingTab() {
  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<AccountingTab>("overview");

  // ── Global date range (overview / sold / expenses) ────────────────────────
  const [dateFrom, setDateFrom] = useState(monthStartIso);
  const [dateTo, setDateTo] = useState(todayIso);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState<AccountingDashboardDto | null>(null);
  const [soldOrders, setSoldOrders] = useState<SoldOrderLineDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [imports, setImports] = useState<ImportTransactionSummaryDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [usageRecords, setUsageRecords] = useState<MaterialUsageRecordDto[]>([]);
  const [stock, setStock] = useState<MaterialStockDto[]>([]);
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
  const [matForm, setMatForm] = useState({ name: "", unit: "pcs", sku: "", description: "" });

  // ── Import modal ──────────────────────────────────────────────────────────
  const [importModal, setImportModal] = useState<{ open: boolean; editingId: number | null }>({ open: false, editingId: null });
  const [importForm, setImportForm] = useState({
    supplier: "", transactionDate: todayIso(), receivedDate: "", invoiceRef: "", notes: "",
    lines: [{ materialId: 0, quantity: "1", unitPrice: "" }] as ImportLine[],
  });

  // ── Expense modal ─────────────────────────────────────────────────────────
  const [expModal, setExpModal] = useState<{ open: boolean; editing: ExpenseDto | null }>({ open: false, editing: null });
  const [expForm, setExpForm] = useState({
    category: DEFAULT_EXPENSE_CATEGORIES[0], name: "", description: "",
    amount: "", expenseDate: todayIso(), notes: "",
  });

  // ── Usage modal ───────────────────────────────────────────────────────────
  const [usageModal, setUsageModal] = useState<{ open: boolean; editing: MaterialUsageRecordDto | null }>({ open: false, editing: null });
  const [usageForm, setUsageForm] = useState({
    materialId: 0, orderId: "", quantityUsed: "1", usageDate: todayIso(), notes: "",
  });

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "material" | "import" | "expense" | "usage"; id: number; name: string;
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

  const loadExpenseCategories = useCallback(async () => {
    const cats = await fetchExpenseCategories();
    setExpenseCategories(cats);
  }, []);

  const loadForTab = useCallback(
    async (t: AccountingTab, from: string, to: string) => {
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
        } else if (t === "imports") {
          const [imps] = await Promise.all([
            fetchImports(),
            loadMaterials(),
          ]);
          setImports(imps);
        } else if (t === "expenses") {
          const [exps] = await Promise.all([
            fetchExpenses(from, to),
            loadExpenseCategories(),
          ]);
          setExpenses(exps);
        } else if (t === "usage") {
          const [usages] = await Promise.all([
            fetchUsageRecords(),
            loadMaterials(),
          ]);
          setUsageRecords(usages);
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
    [loadMaterials, loadExpenseCategories],
  );

  useEffect(() => {
    void loadForTab(tab, dateFrom, dateTo);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "overview" || tab === "sold" || tab === "expenses") {
      void loadForTab(tab, dateFrom, dateTo);
    }
  }, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Material handlers ────────────────────────────────────────────────────
  const openMatModal = (editing: MaterialDto | null) => {
    setMatForm({ name: editing?.name ?? "", unit: editing?.unit ?? "pcs", sku: editing?.sku ?? "", description: editing?.description ?? "" });
    setMatModal({ open: true, editing });
  };

  const saveMaterial = async () => {
    if (!matForm.name.trim()) return;
    setModalLoading(true);
    setError(null);
    try {
      const body = { name: matForm.name.trim(), unit: matForm.unit.trim() || "pcs", sku: matForm.sku.trim() || null, description: matForm.description.trim() || null };
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

  // ─── Import handlers ──────────────────────────────────────────────────────
  const openImportModal = async (editingId: number | null) => {
    if (editingId !== null) {
      setModalLoading(true);
      try {
        const full = await fetchImport(editingId);
        setImportForm({
          supplier: full.supplier ?? "",
          transactionDate: full.transactionDate.slice(0, 10),
          receivedDate: full.receivedDate?.slice(0, 10) ?? "",
          invoiceRef: full.invoiceRef ?? "",
          notes: full.notes ?? "",
          lines: full.lines.length
            ? full.lines.map((l) => ({ materialId: l.materialId, quantity: String(l.quantity), unitPrice: String(l.unitPrice) }))
            : [{ materialId: materials[0]?.id ?? 0, quantity: "1", unitPrice: "" }],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load import");
        setModalLoading(false);
        return;
      }
      setModalLoading(false);
    } else {
      setImportForm({
        supplier: "", transactionDate: todayIso(), receivedDate: "", invoiceRef: "", notes: "",
        lines: [{ materialId: materials[0]?.id ?? 0, quantity: "1", unitPrice: "" }],
      });
    }
    setImportModal({ open: true, editingId });
  };

  const saveImport = async () => {
    const validLines = importForm.lines.filter(
      (l) => l.materialId > 0 && l.quantity.trim() && l.unitPrice.trim(),
    );
    if (!importForm.transactionDate || validLines.length === 0) return;
    setModalLoading(true);
    setError(null);
    try {
      const body = {
        supplier: importForm.supplier.trim() || null,
        transactionDate: importForm.transactionDate,
        receivedDate: importForm.receivedDate || null,
        invoiceRef: importForm.invoiceRef.trim() || null,
        notes: importForm.notes.trim() || null,
        lines: validLines.map((l) => ({
          materialId: l.materialId,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        })),
      };
      if (importModal.editingId !== null) {
        await updateImport(importModal.editingId, body);
      } else {
        await createImport(body);
      }
      setImportModal({ open: false, editingId: null });
      const data = await fetchImports();
      setImports(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setModalLoading(false);
    }
  };

  const addImportLine = () =>
    setImportForm((f) => ({ ...f, lines: [...f.lines, { materialId: materials[0]?.id ?? 0, quantity: "1", unitPrice: "" }] }));

  const removeImportLine = (idx: number) =>
    setImportForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));

  const updateImportLine = (idx: number, patch: Partial<ImportLine>) =>
    setImportForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  // ─── Expense handlers ─────────────────────────────────────────────────────
  const allExpCats = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...expenseCategories])];

  const openExpModal = (editing: ExpenseDto | null) => {
    setExpForm({
      category: editing?.category ?? allExpCats[0] ?? DEFAULT_EXPENSE_CATEGORIES[0],
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      amount: editing ? String(editing.amount) : "",
      expenseDate: editing?.expenseDate?.slice(0, 10) ?? todayIso(),
      notes: editing?.notes ?? "",
    });
    setExpModal({ open: true, editing });
  };

  const saveExpense = async () => {
    if (!expForm.name.trim() || !expForm.amount) return;
    const amount = parseFloat(expForm.amount);
    if (Number.isNaN(amount)) return;
    setModalLoading(true);
    setError(null);
    try {
      const body = {
        category: expForm.category,
        name: expForm.name.trim(),
        description: expForm.description.trim() || null,
        amount,
        expenseDate: expForm.expenseDate,
        notes: expForm.notes.trim() || null,
      };
      if (expModal.editing) {
        await updateExpense(expModal.editing.id, body);
      } else {
        await createExpense(body);
      }
      setExpModal({ open: false, editing: null });
      const data = await fetchExpenses(dateFrom, dateTo);
      setExpenses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Usage handlers ───────────────────────────────────────────────────────
  const openUsageModal = (editing: MaterialUsageRecordDto | null) => {
    setUsageForm({
      materialId: editing?.materialId ?? materials[0]?.id ?? 0,
      orderId: editing?.orderId != null ? String(editing.orderId) : "",
      quantityUsed: editing ? String(editing.quantityUsed) : "1",
      usageDate: editing?.usageDate?.slice(0, 10) ?? todayIso(),
      notes: editing?.notes ?? "",
    });
    setUsageModal({ open: true, editing });
  };

  const saveUsage = async () => {
    if (!usageForm.materialId || !usageForm.quantityUsed) return;
    const qty = parseFloat(usageForm.quantityUsed);
    if (Number.isNaN(qty)) return;
    setModalLoading(true);
    setError(null);
    try {
      const body = {
        materialId: usageForm.materialId,
        orderId: usageForm.orderId ? parseInt(usageForm.orderId, 10) : null,
        quantityUsed: qty,
        usageDate: usageForm.usageDate,
        notes: usageForm.notes.trim() || null,
      };
      if (usageModal.editing) {
        await updateUsage(usageModal.editing.id, body);
      } else {
        await createUsage(body);
      }
      setUsageModal({ open: false, editing: null });
      const data = await fetchUsageRecords();
      setUsageRecords(data);
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
      if (deleteTarget.type === "material") await deleteMaterial(deleteTarget.id);
      else if (deleteTarget.type === "import") await deleteImport(deleteTarget.id);
      else if (deleteTarget.type === "expense") await deleteExpense(deleteTarget.id);
      else await deleteUsage(deleteTarget.id);
      setDeleteTarget(null);
      if (deleteTarget.type === "material") await loadMaterials();
      else if (deleteTarget.type === "import") { const d = await fetchImports(); setImports(d); }
      else if (deleteTarget.type === "expense") { const d = await fetchExpenses(dateFrom, dateTo); setExpenses(d); }
      else { const d = await fetchUsageRecords(); setUsageRecords(d); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
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
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-colors duration-200 cursor-pointer flex-shrink-0"
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
              value={formatEuro(dashboard?.soldRevenue ?? 0)}
              sub={`${dashboard?.totalOrdersSold ?? 0} orders received`}
              icon={<TrendingUp size={16} />}
              accent="rgba(34,120,80,0.12)"
            />
            <KpiCard
              label="Import spend"
              value={formatEuro(dashboard?.importSpend ?? 0)}
              icon={<Truck size={16} />}
            />
            <KpiCard
              label="Expense spend"
              value={formatEuro(dashboard?.expenseSpend ?? 0)}
              icon={<Tag size={16} />}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard
              label="Net (revenue − spend)"
              value={formatEuro(dashboard?.net ?? 0)}
              sub={(dashboard?.net ?? 0) >= 0 ? "Positive period" : "Negative period"}
              icon={(dashboard?.net ?? 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              accent={(dashboard?.net ?? 0) >= 0 ? "rgba(34,120,80,0.12)" : "rgba(74,14,14,0.1)"}
            />
            <KpiCard
              label="Material stock value"
              value={formatEuro(dashboard?.materialStockValue ?? 0)}
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
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200 text-sm"
                    style={{ gridTemplateColumns: "0.6fr 1fr 1.5fr 0.8fr 0.8fr", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-[#2D241E]/60">#{o.orderId}</span>
                    <span className="text-[#2D241E]/60">{formatDate(o.orderDate)}</span>
                    <span className="text-[#2D241E]">{o.customerName}</span>
                    <span className="text-[#2D241E]/60 capitalize">{o.status}</span>
                    <span className="text-[#2D241E] font-medium">{formatEuro(o.total)}</span>
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
                    <span className="text-[#2D241E] font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatEuro(o.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

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
            <TableHeader cols={["Name", "SKU", "Unit", "Active", "Actions"]} widths="1.5fr 1fr 0.8fr 0.6fr 100px" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {materials.length === 0 ? (
                <EmptyRow message="No materials yet" />
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200"
                    style={{ gridTemplateColumns: "1.5fr 1fr 0.8fr 0.6fr 100px", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <div>
                      <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>{m.name}</p>
                      {m.description && <p className="text-xs text-[#2D241E]/45 mt-0.5">{m.description}</p>}
                    </div>
                    <span className="text-sm text-[#2D241E]/60">{m.sku || "—"}</span>
                    <span className="text-sm text-[#2D241E]/60">{m.unit}</span>
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
                  subtitle={`${m.unit}${m.sku ? ` · SKU: ${m.sku}` : ""}`}
                  extra={m.description || undefined}
                  onEdit={() => openMatModal(m)}
                  onDelete={() => setDeleteTarget({ type: "material", id: m.id, name: m.name })}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Imports ───────────────────────────────────────────────────────── */}
      {tab === "imports" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{imports.length} import transactions</p>
            <PrimaryButton onClick={() => void openImportModal(null)} disabled={materials.length === 0}>
              <Plus size={14} />
              <span className="uppercase tracking-widest">New import</span>
            </PrimaryButton>
          </div>
          {materials.length === 0 && (
            <p className="mb-4 text-sm text-[#4A0E0E]/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Add materials first before recording imports.</p>
          )}
          <div className="rounded-[28px] overflow-x-auto hidden md:block" style={cardBorder}>
            <TableHeader cols={["Date", "Supplier", "Invoice ref", "Items", "Total", "Actions"]} widths="0.9fr 1.2fr 1fr 0.5fr 0.8fr 100px" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {imports.length === 0 ? (
                <EmptyRow message="No imports yet" />
              ) : (
                imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200 text-sm"
                    style={{ gridTemplateColumns: "0.9fr 1.2fr 1fr 0.5fr 0.8fr 100px", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-[#2D241E]/60">{formatDate(imp.transactionDate)}</span>
                    <span className="text-[#2D241E]">{imp.supplier || "—"}</span>
                    <span className="text-[#2D241E]/60">{imp.invoiceRef || "—"}</span>
                    <span className="text-[#2D241E]/60">{imp.lineCount}</span>
                    <span className="text-[#2D241E] font-medium">{formatEuro(imp.totalAmount)}</span>
                    <ActionButtons
                      onEdit={() => void openImportModal(imp.id)}
                      onDelete={() => setDeleteTarget({ type: "import", id: imp.id, name: imp.supplier ?? `Import #${imp.id}` })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {imports.length === 0 ? (
              <EmptyCard message="No imports yet" />
            ) : (
              imports.map((imp) => (
                <MobileCard
                  key={imp.id}
                  title={imp.supplier ?? `Import #${imp.id}`}
                  subtitle={`${formatDate(imp.transactionDate)} · ${imp.lineCount} items · ${formatEuro(imp.totalAmount)}`}
                  extra={imp.invoiceRef ? `Invoice: ${imp.invoiceRef}` : undefined}
                  onEdit={() => void openImportModal(imp.id)}
                  onDelete={() => setDeleteTarget({ type: "import", id: imp.id, name: imp.supplier ?? `Import #${imp.id}` })}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Usage ─────────────────────────────────────────────────────────── */}
      {tab === "usage" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{usageRecords.length} usage records</p>
            <PrimaryButton onClick={() => openUsageModal(null)} disabled={materials.length === 0}>
              <Plus size={14} />
              <span className="uppercase tracking-widest">Log usage</span>
            </PrimaryButton>
          </div>
          {materials.length === 0 && (
            <p className="mb-4 text-sm text-[#4A0E0E]/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Add materials first before logging usage.</p>
          )}
          <div className="rounded-[28px] overflow-x-auto hidden md:block" style={cardBorder}>
            <TableHeader cols={["Material", "Date", "Qty", "Order ID", "Notes", "Actions"]} widths="1.4fr 0.9fr 0.5fr 0.7fr 1.5fr 100px" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {usageRecords.length === 0 ? (
                <EmptyRow message="No usage records yet" />
              ) : (
                usageRecords.map((u) => (
                  <div
                    key={u.id}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200 text-sm"
                    style={{ gridTemplateColumns: "1.4fr 0.9fr 0.5fr 0.7fr 1.5fr 100px", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-[#2D241E]">{u.materialName}</span>
                    <span className="text-[#2D241E]/60">{formatDate(u.usageDate)}</span>
                    <span className="text-[#2D241E]/60">{u.quantityUsed}</span>
                    <span className="text-[#2D241E]/60">{u.orderId != null ? `#${u.orderId}` : "—"}</span>
                    <span className="text-[#2D241E]/55 truncate">{u.notes || "—"}</span>
                    <ActionButtons
                      onEdit={() => openUsageModal(u)}
                      onDelete={() => setDeleteTarget({ type: "usage", id: u.id, name: `${u.materialName} (${formatDate(u.usageDate)})` })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {usageRecords.length === 0 ? (
              <EmptyCard message="No usage records yet" />
            ) : (
              usageRecords.map((u) => (
                <MobileCard
                  key={u.id}
                  title={u.materialName}
                  subtitle={`${formatDate(u.usageDate)} · qty: ${u.quantityUsed}${u.orderId != null ? ` · order #${u.orderId}` : ""}`}
                  extra={u.notes || undefined}
                  onEdit={() => openUsageModal(u)}
                  onDelete={() => setDeleteTarget({ type: "usage", id: u.id, name: `${u.materialName} (${formatDate(u.usageDate)})` })}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Expenses ──────────────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <>
          {dateRangeBar}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{expenses.length} expenses</p>
            <PrimaryButton onClick={() => openExpModal(null)}>
              <Plus size={14} />
              <span className="uppercase tracking-widest">Add expense</span>
            </PrimaryButton>
          </div>
          <div className="rounded-[28px] overflow-x-auto hidden md:block" style={cardBorder}>
            <TableHeader cols={["Name", "Category", "Date", "Amount", "Notes", "Actions"]} widths="1.4fr 1fr 0.9fr 0.8fr 1.4fr 100px" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {expenses.length === 0 ? (
                <EmptyRow message="No expenses in this period" />
              ) : (
                expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200 text-sm"
                    style={{ gridTemplateColumns: "1.4fr 1fr 0.9fr 0.8fr 1.4fr 100px", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-[#2D241E]">{ex.name}</span>
                    <span className="text-[#2D241E]/60">{ex.category}</span>
                    <span className="text-[#2D241E]/60">{formatDate(ex.expenseDate)}</span>
                    <span className="text-[#2D241E] font-medium">{formatEuro(ex.amount)}</span>
                    <span className="text-[#2D241E]/55 truncate">{ex.notes || ex.description || "—"}</span>
                    <ActionButtons
                      onEdit={() => openExpModal(ex)}
                      onDelete={() => setDeleteTarget({ type: "expense", id: ex.id, name: ex.name })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {expenses.length === 0 ? (
              <EmptyCard message="No expenses in this period" />
            ) : (
              expenses.map((ex) => (
                <MobileCard
                  key={ex.id}
                  title={ex.name}
                  subtitle={`${ex.category} · ${formatDate(ex.expenseDate)} · ${formatEuro(ex.amount)}`}
                  extra={ex.notes || ex.description || undefined}
                  onEdit={() => openExpModal(ex)}
                  onDelete={() => setDeleteTarget({ type: "expense", id: ex.id, name: ex.name })}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Stock ─────────────────────────────────────────────────────────── */}
      {tab === "stock" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{stock.length} materials tracked</p>
            <GhostButton onClick={() => void fetchMaterialStock().then(setStock).catch((e) => setError(e instanceof Error ? e.message : "Failed"))} disabled={loading}>
              <RefreshCw size={14} />
              <span className="uppercase tracking-widest">Refresh</span>
            </GhostButton>
          </div>
          <div className="rounded-[28px] overflow-x-auto hidden md:block" style={cardBorder}>
            <TableHeader cols={["Material", "SKU", "Unit", "Imported", "Used", "On hand", "Avg cost", "Stock value"]} widths="1.4fr 0.8fr 0.6fr 0.7fr 0.7fr 0.7fr 0.8fr 0.9fr" />
            <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              {stock.length === 0 ? (
                <EmptyRow message="No stock data yet" />
              ) : (
                stock.map((s) => (
                  <div
                    key={s.materialId}
                    className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors duration-200 text-sm"
                    style={{ gridTemplateColumns: "1.4fr 0.8fr 0.6fr 0.7fr 0.7fr 0.7fr 0.8fr 0.9fr", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-[#2D241E] font-medium">{s.name}</span>
                    <span className="text-[#2D241E]/60">{s.sku || "—"}</span>
                    <span className="text-[#2D241E]/60">{s.unit}</span>
                    <span className="text-[#2D241E]/60">{s.qtyImported}</span>
                    <span className="text-[#2D241E]/60">{s.qtyUsed}</span>
                    <span className="text-[#2D241E]">{s.qtyOnHand}</span>
                    <span className="text-[#2D241E]/60">{formatEuro(s.avgUnitCost)}</span>
                    <span className="text-[#2D241E] font-medium">{formatEuro(s.totalStockValue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {stock.length === 0 ? (
              <EmptyCard message="No stock data yet" />
            ) : (
              stock.map((s) => (
                <div key={s.materialId} className="rounded-[20px] p-4" style={{ ...cardBorder, backgroundColor: "rgba(255,255,255,0.45)" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>{s.name}</p>
                      <p className="text-xs text-[#2D241E]/50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.unit}{s.sku ? ` · ${s.sku}` : ""}</p>
                    </div>
                    <span className="text-[#2D241E] font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatEuro(s.totalStockValue)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-[#2D241E]/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span>Imported: {s.qtyImported}</span>
                    <span>Used: {s.qtyUsed}</span>
                    <span>On hand: {s.qtyOnHand}</span>
                    <span>Avg cost: {formatEuro(s.avgUnitCost)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
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
                          {formatDate(sr.snapshotDate)} · {sr.lineCount} materials · {formatEuro(sr.totalStockValue)}
                        </p>
                        {sr.notes && <p className="text-xs text-[#2D241E]/45 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{sr.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleExpandReport(sr.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors cursor-pointer flex-shrink-0"
                      >
                        {expanded ? <ChevronUp size={16} style={{ color: "#2D241E", opacity: 0.5 }} /> : <ChevronDown size={16} style={{ color: "#2D241E", opacity: 0.5 }} />}
                      </button>
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
                                    <td className="px-4 py-3 text-[#2D241E]/60">{formatEuro(ln.avgUnitCost)}</td>
                                    <td className="px-4 py-3 text-[#2D241E] font-medium">{formatEuro(ln.totalValue)}</td>
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
                <KpiCard label="Revenue" value={formatEuro(report.soldRevenue)} icon={<TrendingUp size={16} />} accent="rgba(34,120,80,0.12)" />
                <KpiCard label="Import spend" value={formatEuro(report.importSpend)} icon={<Truck size={16} />} />
                <KpiCard label="Expense spend" value={formatEuro(report.expenseSpend)} icon={<Tag size={16} />} />
                <KpiCard label="Net" value={formatEuro(report.net)} icon={report.net >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} accent={report.net >= 0 ? "rgba(34,120,80,0.12)" : "rgba(74,14,14,0.1)"} />
              </div>

              {report.orders && report.orders.length > 0 && (
                <ReportSection title="Orders">
                  {report.orders.map((o) => (
                    <div key={o.orderId} className="px-4 py-3 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="text-[#2D241E]">#{o.orderId} — {o.customerName}</span>
                      <span className="text-[#2D241E]/55">{formatDate(o.orderDate)} · {formatEuro(o.total)}</span>
                    </div>
                  ))}
                </ReportSection>
              )}

              {report.importTransactions && report.importTransactions.length > 0 && (
                <ReportSection title="Imports">
                  {report.importTransactions.map((imp) => (
                    <div key={imp.id} className="px-4 py-3 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="text-[#2D241E]">{imp.supplier || `Import #${imp.id}`}{imp.invoiceRef ? ` · ${imp.invoiceRef}` : ""}</span>
                      <span className="text-[#2D241E]/55">{formatDate(imp.transactionDate)} · {formatEuro(imp.totalAmount)}</span>
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
                        <span className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatEuro(cat.totalAmount)}</span>
                      </div>
                      <div className="rounded-xl overflow-hidden mb-3" style={cardBorder}>
                        {cat.items.map((item) => (
                          <div key={item.id} className="px-3 py-2.5 text-sm border-b last:border-b-0 flex justify-between gap-2" style={{ borderColor: "rgba(45,36,30,0.06)", fontFamily: "'DM Sans', sans-serif" }}>
                            <span className="text-[#2D241E]">{item.name}</span>
                            <span className="text-[#2D241E]/55">{formatDate(item.expenseDate)} · {formatEuro(item.amount)}</span>
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
                      <span className="text-[#2D241E]/55">{s.qtyOnHand} on hand · {formatEuro(s.totalValue)}</span>
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
              <div>
                <FieldLabel>Description (optional)</FieldLabel>
                <TextArea value={matForm.description} onChange={(e) => setMatForm((f) => ({ ...f, description: e.target.value }))} />
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

        {/* Import modal */}
        {importModal.open && (
          <ModalShell title={importModal.editingId !== null ? "Edit import" : "New import transaction"} onClose={() => setImportModal({ open: false, editingId: null })} wide>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Supplier</FieldLabel>
                  <TextInput value={importForm.supplier} onChange={(e) => setImportForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
                </div>
                <div>
                  <FieldLabel>Invoice ref</FieldLabel>
                  <TextInput value={importForm.invoiceRef} onChange={(e) => setImportForm((f) => ({ ...f, invoiceRef: e.target.value }))} placeholder="INV-0001" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Transaction date</FieldLabel>
                  <TextInput type="date" value={importForm.transactionDate} onChange={(e) => setImportForm((f) => ({ ...f, transactionDate: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Received date (optional)</FieldLabel>
                  <TextInput type="date" value={importForm.receivedDate} onChange={(e) => setImportForm((f) => ({ ...f, receivedDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Notes (optional)</FieldLabel>
                <TextArea value={importForm.notes} onChange={(e) => setImportForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={labelStyle}>Line items</span>
                  <button
                    type="button"
                    onClick={addImportLine}
                    className="flex items-center gap-1.5 text-xs text-[#2D241E]/60 hover:text-[#2D241E] transition-colors cursor-pointer"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}
                  >
                    <Plus size={12} /> Add line
                  </button>
                </div>
                <div className="space-y-2">
                  {importForm.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_90px_90px_32px] gap-2 items-end">
                      <div>
                        {idx === 0 && <FieldLabel>Material</FieldLabel>}
                        <SelectInput
                          value={line.materialId}
                          onChange={(e) => updateImportLine(idx, { materialId: Number(e.target.value) })}
                        >
                          <option value={0} disabled>Select material</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                          ))}
                        </SelectInput>
                      </div>
                      <div>
                        {idx === 0 && <FieldLabel>Qty</FieldLabel>}
                        <TextInput
                          type="number"
                          min={0}
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateImportLine(idx, { quantity: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        {idx === 0 && <FieldLabel>Unit price (€)</FieldLabel>}
                        <TextInput
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateImportLine(idx, { unitPrice: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImportLine(idx)}
                        disabled={importForm.lines.length === 1}
                        className="w-8 h-[42px] rounded-xl flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X size={13} style={{ color: "#4A0E0E", opacity: 0.7 }} />
                      </button>
                    </div>
                  ))}
                </div>
                {importForm.lines.some((l) => l.quantity && l.unitPrice) && (
                  <p className="mt-2 text-xs text-right text-[#2D241E]/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Total: {formatEuro(importForm.lines.reduce((sum, l) => {
                      const q = parseFloat(l.quantity) || 0;
                      const p = parseFloat(l.unitPrice) || 0;
                      return sum + q * p;
                    }, 0))}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setImportModal({ open: false, editingId: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void saveImport()} disabled={modalLoading}>
                {modalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </PrimaryButton>
            </div>
          </ModalShell>
        )}

        {/* Expense modal */}
        {expModal.open && (
          <ModalShell title={expModal.editing ? "Edit expense" : "New expense"} onClose={() => setExpModal({ open: false, editing: null })}>
            <div className="space-y-4 mb-6">
              <div>
                <FieldLabel>Category</FieldLabel>
                <SelectInput value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}>
                  {allExpCats.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={expForm.name} onChange={(e) => setExpForm((f) => ({ ...f, name: e.target.value }))} placeholder="Expense name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Amount (€)</FieldLabel>
                  <TextInput type="number" min={0} step="0.01" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <TextInput type="date" value={expForm.expenseDate} onChange={(e) => setExpForm((f) => ({ ...f, expenseDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Description (optional)</FieldLabel>
                <TextArea value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Notes (optional)</FieldLabel>
                <TextInput value={expForm.notes} onChange={(e) => setExpForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setExpModal({ open: false, editing: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void saveExpense()} disabled={modalLoading || !expForm.name.trim() || !expForm.amount}>
                {modalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </PrimaryButton>
            </div>
          </ModalShell>
        )}

        {/* Usage modal */}
        {usageModal.open && (
          <ModalShell title={usageModal.editing ? "Edit usage record" : "Log material usage"} onClose={() => setUsageModal({ open: false, editing: null })}>
            <div className="space-y-4 mb-6">
              <div>
                <FieldLabel>Material</FieldLabel>
                <SelectInput value={usageForm.materialId} onChange={(e) => setUsageForm((f) => ({ ...f, materialId: Number(e.target.value) }))}>
                  <option value={0} disabled>Select material</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </SelectInput>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Quantity used</FieldLabel>
                  <TextInput type="number" min={0} step="0.001" value={usageForm.quantityUsed} onChange={(e) => setUsageForm((f) => ({ ...f, quantityUsed: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <TextInput type="date" value={usageForm.usageDate} onChange={(e) => setUsageForm((f) => ({ ...f, usageDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Order ID (optional)</FieldLabel>
                <TextInput type="number" min={1} value={usageForm.orderId} onChange={(e) => setUsageForm((f) => ({ ...f, orderId: e.target.value }))} placeholder="Leave blank if not linked to an order" />
              </div>
              <div>
                <FieldLabel>Notes (optional)</FieldLabel>
                <TextArea value={usageForm.notes} onChange={(e) => setUsageForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setUsageModal({ open: false, editing: null })}>Cancel</GhostButton>
              <PrimaryButton onClick={() => void saveUsage()} disabled={modalLoading || !usageForm.materialId || !usageForm.quantityUsed}>
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
              This will snapshot the current stock levels and lock the report. It cannot be undone.
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

        {/* Delete confirm */}
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
                disabled={modalLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[#F5F2ED] transition-opacity duration-200 hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem" }}
              >
                {modalLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
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
