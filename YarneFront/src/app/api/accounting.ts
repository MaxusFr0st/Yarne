import { apiRequest, clearLegacyAuthStorage } from "./client";
import { buildApiUrl, resolveApiBase } from "./base";

const API_BASE = resolveApiBase();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MaterialDto {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  sku: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MaterialStockDto {
  materialId: number;
  name: string;
  unit: string;
  sku: string | null;
  qtyImported: number;
  qtyUsed: number;
  qtyOnHand: number;
  avgUnitCost: number;
  totalStockValue: number;
}

export interface ImportTransactionLineDto {
  id: number;
  materialId: number;
  materialName: string;
  materialUnit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ImportTransactionDto {
  id: number;
  supplier: string | null;
  transactionDate: string;
  receivedDate: string | null;
  notes: string | null;
  invoiceRef: string | null;
  isLocked: boolean;
  createdAt: string;
  totalAmount: number;
  lines: ImportTransactionLineDto[];
}

export interface ImportTransactionSummaryDto {
  id: number;
  supplier: string | null;
  transactionDate: string;
  receivedDate: string | null;
  invoiceRef: string | null;
  isLocked: boolean;
  createdAt: string;
  totalAmount: number;
  lineCount: number;
}

export interface ExpenseDto {
  id: number;
  category: string;
  name: string;
  description: string | null;
  amount: number;
  expenseDate: string;
  notes: string | null;
  createdAt: string;
}

export interface MaterialUsageRecordDto {
  id: number;
  materialId: number;
  materialName: string;
  orderId: number | null;
  externalOrderId: number | null;
  orderDisplay: string | null;
  quantityUsed: number;
  usageDate: string;
  notes: string | null;
  createdAt: string;
}

export interface SoldOrderLineDto {
  orderId: number;
  orderDate: string;
  status: string;
  total: number;
  customerName: string;
}

export interface StockReportSummaryDto {
  id: number;
  snapshotDate: string;
  label: string | null;
  notes: string | null;
  createdAt: string;
  isLocked: boolean;
  lineCount: number;
  totalStockValue: number;
}

export interface StockReportLineDto {
  id: number;
  materialId: number;
  materialName: string;
  materialUnit: string;
  qtyImported: number;
  qtyUsed: number;
  qtyOnHand: number;
  avgUnitCost: number;
  totalValue: number;
}

export interface StockReportDetailDto {
  id: number;
  snapshotDate: string;
  label: string | null;
  notes: string | null;
  createdAt: string;
  isLocked: boolean;
  totalStockValue: number;
  lines: StockReportLineDto[];
}

export interface AccountingDashboardDto {
  dateFrom: string | null;
  dateTo: string | null;
  soldRevenue: number;
  totalOrdersSold: number;
  importSpend: number;
  expenseSpend: number;
  totalSpent: number;
  net: number;
  materialStockValue: number;
  materialCount: number;
}

export interface AccountingReportDto {
  dateFrom: string | null;
  dateTo: string | null;
  soldRevenue: number;
  importSpend: number;
  expenseSpend: number;
  totalSpent: number;
  net: number;
  orders: SoldOrderLineDto[];
  importTransactions: { id: number; supplier: string | null; transactionDate: string; invoiceRef: string | null; totalAmount: number; lineCount: number }[];
  expensesByCategory: { category: string; totalAmount: number; items: { id: number; name: string; amount: number; expenseDate: string; description: string | null }[] }[];
  stockSnapshot: { materialId: number; materialName: string; materialUnit: string; qtyOnHand: number; avgUnitCost: number; totalValue: number }[];
}

export interface AccountingReportParams {
  from?: string;
  to?: string;
  includeOrders?: boolean;
  includeImports?: boolean;
  includeExpenses?: boolean;
  includeStock?: boolean;
}

export type CreateMaterialRequest = { name: string; description?: string | null; unit?: string; sku?: string | null; isActive?: boolean };
export type UpdateMaterialRequest = CreateMaterialRequest;

export type CreateImportLineRequest = { materialId: number; quantity: number; unitPrice: number };
export type CreateImportTransactionRequest = {
  supplier?: string | null;
  transactionDate: string;
  receivedDate?: string | null;
  notes?: string | null;
  invoiceRef?: string | null;
  lines: CreateImportLineRequest[];
};

export type CreateExpenseRequest = {
  category: string;
  name: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  notes?: string | null;
};

export type CreateMaterialUsageRequest = {
  materialId: number;
  orderId?: number | null;
  externalOrderId?: number | null;
  quantityUsed: number;
  usageDate: string;
  notes?: string | null;
};

export interface ExpenseCategoryDto {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface WebsiteOrderOptionDto {
  orderId: number;
  displayId: string;
  orderDate: string;
  status: string;
  customerName: string;
  total: number;
}

export interface ExternalOrderOptionDto {
  id: number;
  displayId: string;
  label: string | null;
  customerName: string | null;
  orderDate: string;
}

export interface UsageOrderOptionsDto {
  websiteOrders: WebsiteOrderOptionDto[];
  externalOrders: ExternalOrderOptionDto[];
}

export interface ExternalOrderDto {
  id: number;
  displayId: string;
  label: string | null;
  customerName: string | null;
  orderDate: string;
  notes: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDateQuery(from?: string, to?: string): string {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function buildReportQuery(params: AccountingReportParams): string {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.includeOrders !== undefined) qs.set("includeOrders", String(params.includeOrders));
  if (params.includeImports !== undefined) qs.set("includeImports", String(params.includeImports));
  if (params.includeExpenses !== undefined) qs.set("includeExpenses", String(params.includeExpenses));
  if (params.includeStock !== undefined) qs.set("includeStock", String(params.includeStock));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ─── Materials ───────────────────────────────────────────────────────────────

export async function fetchMaterials(isActive?: boolean): Promise<MaterialDto[]> {
  const qs = isActive !== undefined ? `?isActive=${isActive}` : "";
  const data = await apiRequest<MaterialDto[]>(`/api/accounting/materials${qs}`);
  return Array.isArray(data) ? data : [];
}

export async function createMaterial(body: CreateMaterialRequest): Promise<MaterialDto> {
  return apiRequest<MaterialDto>("/api/accounting/materials", { method: "POST", body: JSON.stringify(body) });
}

export async function updateMaterial(id: number, body: UpdateMaterialRequest): Promise<MaterialDto> {
  return apiRequest<MaterialDto>(`/api/accounting/materials/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteMaterial(id: number): Promise<void> {
  await apiRequest(`/api/accounting/materials/${id}`, { method: "DELETE" });
}

export async function fetchMaterialStock(materialId?: number): Promise<MaterialStockDto[]> {
  const qs = materialId != null ? `?materialId=${materialId}` : "";
  const data = await apiRequest<MaterialStockDto[]>(`/api/accounting/materials/stock${qs}`);
  return Array.isArray(data) ? data : [];
}

// ─── Imports ─────────────────────────────────────────────────────────────────

export async function fetchImports(from?: string, to?: string): Promise<ImportTransactionSummaryDto[]> {
  const data = await apiRequest<ImportTransactionSummaryDto[]>(`/api/accounting/imports${buildDateQuery(from, to)}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchImport(id: number): Promise<ImportTransactionDto> {
  return apiRequest<ImportTransactionDto>(`/api/accounting/imports/${id}`);
}

export async function createImport(body: CreateImportTransactionRequest): Promise<ImportTransactionDto> {
  return apiRequest<ImportTransactionDto>("/api/accounting/imports", { method: "POST", body: JSON.stringify(body) });
}

export async function updateImport(id: number, body: CreateImportTransactionRequest): Promise<ImportTransactionDto> {
  return apiRequest<ImportTransactionDto>(`/api/accounting/imports/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteImport(id: number): Promise<void> {
  await apiRequest(`/api/accounting/imports/${id}`, { method: "DELETE" });
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function fetchExpenses(from?: string, to?: string, category?: string): Promise<ExpenseDto[]> {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (category) qs.set("category", category);
  const s = qs.toString();
  const data = await apiRequest<ExpenseDto[]>(`/api/accounting/expenses${s ? `?${s}` : ""}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchExpenseCategories(): Promise<string[]> {
  const data = await apiRequest<string[]>("/api/accounting/expenses/categories");
  return Array.isArray(data) ? data : [];
}

export async function createExpense(body: CreateExpenseRequest): Promise<ExpenseDto> {
  return apiRequest<ExpenseDto>("/api/accounting/expenses", { method: "POST", body: JSON.stringify(body) });
}

export async function updateExpense(id: number, body: CreateExpenseRequest): Promise<ExpenseDto> {
  return apiRequest<ExpenseDto>(`/api/accounting/expenses/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteExpense(id: number): Promise<void> {
  await apiRequest(`/api/accounting/expenses/${id}`, { method: "DELETE" });
}

export async function fetchExpenseCategoryRecords(): Promise<ExpenseCategoryDto[]> {
  const data = await apiRequest<ExpenseCategoryDto[]>("/api/accounting/expense-categories");
  return Array.isArray(data) ? data : [];
}

export async function createExpenseCategory(body: { name: string; description?: string | null }): Promise<ExpenseCategoryDto> {
  return apiRequest<ExpenseCategoryDto>("/api/accounting/expense-categories", { method: "POST", body: JSON.stringify(body) });
}

export async function updateExpenseCategory(id: number, body: { name: string; description?: string | null }): Promise<ExpenseCategoryDto> {
  return apiRequest<ExpenseCategoryDto>(`/api/accounting/expense-categories/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  await apiRequest(`/api/accounting/expense-categories/${id}`, { method: "DELETE" });
}

export async function fetchUsageOrderOptions(): Promise<UsageOrderOptionsDto> {
  return apiRequest<UsageOrderOptionsDto>("/api/accounting/usage/order-options");
}

export async function createExternalOrder(body: {
  label?: string | null;
  customerName?: string | null;
  orderDate: string;
  notes?: string | null;
}): Promise<ExternalOrderDto> {
  return apiRequest<ExternalOrderDto>("/api/accounting/external-orders", { method: "POST", body: JSON.stringify(body) });
}

// ─── Sold ────────────────────────────────────────────────────────────────────

export async function fetchSoldOrders(from?: string, to?: string): Promise<SoldOrderLineDto[]> {
  const data = await apiRequest<SoldOrderLineDto[]>(`/api/accounting/sold${buildDateQuery(from, to)}`);
  return Array.isArray(data) ? data : [];
}

// ─── Usage ───────────────────────────────────────────────────────────────────

export async function fetchUsageRecords(materialId?: number, orderId?: number): Promise<MaterialUsageRecordDto[]> {
  const qs = new URLSearchParams();
  if (materialId != null) qs.set("materialId", String(materialId));
  if (orderId != null) qs.set("orderId", String(orderId));
  const s = qs.toString();
  const data = await apiRequest<MaterialUsageRecordDto[]>(`/api/accounting/usage${s ? `?${s}` : ""}`);
  return Array.isArray(data) ? data : [];
}

export async function createUsage(body: CreateMaterialUsageRequest): Promise<MaterialUsageRecordDto> {
  return apiRequest<MaterialUsageRecordDto>("/api/accounting/usage", { method: "POST", body: JSON.stringify(body) });
}

export async function updateUsage(id: number, body: CreateMaterialUsageRequest): Promise<MaterialUsageRecordDto> {
  return apiRequest<MaterialUsageRecordDto>(`/api/accounting/usage/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteUsage(id: number): Promise<void> {
  await apiRequest(`/api/accounting/usage/${id}`, { method: "DELETE" });
}

// ─── Stock reports ───────────────────────────────────────────────────────────

export async function fetchStockReports(): Promise<StockReportSummaryDto[]> {
  const data = await apiRequest<StockReportSummaryDto[]>("/api/accounting/stock-reports");
  return Array.isArray(data) ? data : [];
}

export async function fetchStockReport(id: number): Promise<StockReportDetailDto> {
  return apiRequest<StockReportDetailDto>(`/api/accounting/stock-reports/${id}`);
}

export async function createStockReport(body: { label?: string | null; notes?: string | null }): Promise<StockReportDetailDto> {
  return apiRequest<StockReportDetailDto>("/api/accounting/stock-reports", { method: "POST", body: JSON.stringify(body) });
}

// ─── Dashboard & reports ───────────────────────────────────────────────────

export async function fetchAccountingDashboard(from?: string, to?: string): Promise<AccountingDashboardDto> {
  return apiRequest<AccountingDashboardDto>(`/api/accounting/dashboard${buildDateQuery(from, to)}`);
}

export async function fetchAccountingReport(params: AccountingReportParams): Promise<AccountingReportDto> {
  return apiRequest<AccountingReportDto>(`/api/accounting/report${buildReportQuery(params)}`);
}

export async function downloadAccountingReportPdf(params: AccountingReportParams): Promise<void> {
  const res = await fetch(buildApiUrl(API_BASE, `/api/accounting/report/pdf${buildReportQuery(params)}`), {
    credentials: "include",
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 401) {
    clearLegacyAuthStorage();
    window.dispatchEvent(new CustomEvent("auth-expired"));
    throw new Error("Session expired.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `PDF download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yarne-report-${params.from ?? "start"}-${params.to ?? "today"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const DEFAULT_EXPENSE_CATEGORIES = ["Marketing", "Utilities", "Operations", "Shipping", "Other"];
