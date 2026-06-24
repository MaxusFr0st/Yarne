import { apiRequest } from "./client";
import { buildApiUrl, resolveApiBase } from "./base";

const API_BASE = resolveApiBase();

function getAuthToken(): string | null {
  return sessionStorage.getItem("auth_token") ?? localStorage.getItem("auth_token");
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccountingCategoryDto {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface AccountingPurchaseDto {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  supplier: string | null;
  purchaseDate: string;
  receivedDate: string | null;
  soldDate: string | null;
  quantity: number;
  quantitySold: number;
  unitCost: number;
  saleUnitPrice: number | null;
  notes: string | null;
  createdAt: string;
  quantityRemaining: number;
  totalCost: number;
  remainingValue: number;
}

export interface MarketingExpenditureDto {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  expenseDate: string;
  notes: string | null;
  createdAt: string;
}

export interface AccountingDashboardDto {
  dateFrom: string | null;
  dateTo: string | null;
  orderRevenue: number;
  manualSaleRevenue: number;
  totalRevenue: number;
  purchaseSpend: number;
  marketingSpend: number;
  totalSpent: number;
  net: number;
  totalOrdersSold: number;
  remainingInventoryItems: number;
  remainingInventoryValue: number;
}

export interface ReportOrderLineDto {
  orderId: number;
  orderDate: string;
  status: string;
  total: number;
  customerName: string;
}

export interface ReportPurchaseLineDto {
  purchaseId: number;
  name: string;
  supplier: string | null;
  purchaseDate: string;
  quantity: number;
  quantitySold: number;
  unitCost: number;
  saleUnitPrice: number | null;
  totalCost: number;
  saleRevenue: number;
}

export interface ReportCategoryBreakdownDto {
  categoryId: number;
  categoryName: string;
  totalCost: number;
  totalSaleRevenue: number;
  items: ReportPurchaseLineDto[];
}

export interface ReportMarketingLineDto {
  id: number;
  name: string;
  amount: number;
  expenseDate: string;
  description: string | null;
}

export interface ReportInventoryItemDto {
  purchaseId: number;
  name: string;
  categoryName: string;
  quantityRemaining: number;
  unitCost: number;
  remainingValue: number;
}

export interface AccountingReportDto {
  dateFrom: string | null;
  dateTo: string | null;
  orderRevenue: number;
  manualSaleRevenue: number;
  totalRevenue: number;
  purchaseSpend: number;
  marketingSpend: number;
  totalSpent: number;
  net: number;
  orders: ReportOrderLineDto[];
  purchasesByCategory: ReportCategoryBreakdownDto[];
  marketingItems: ReportMarketingLineDto[];
  remainingInventory: ReportInventoryItemDto[];
}

export interface AccountingReportParams {
  from?: string;
  to?: string;
  categoryIds?: number[];
  includeOrders?: boolean;
  includePurchases?: boolean;
  includeMarketing?: boolean;
}

export type CreateAccountingCategoryRequest = { name: string; description?: string | null };
export type UpdateAccountingCategoryRequest = CreateAccountingCategoryRequest;

export type CreateAccountingPurchaseRequest = {
  categoryId: number;
  name: string;
  description?: string | null;
  supplier?: string | null;
  purchaseDate: string;
  receivedDate?: string | null;
  soldDate?: string | null;
  quantity: number;
  quantitySold: number;
  unitCost: number;
  saleUnitPrice?: number | null;
  notes?: string | null;
};

export type UpdateAccountingPurchaseRequest = CreateAccountingPurchaseRequest;

export type CreateMarketingExpenditureRequest = {
  name: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  notes?: string | null;
};

export type UpdateMarketingExpenditureRequest = CreateMarketingExpenditureRequest;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildReportQuery(params: AccountingReportParams): string {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.categoryIds?.length) {
    for (const id of params.categoryIds) qs.append("categoryIds", String(id));
  }
  if (params.includeOrders !== undefined) qs.set("includeOrders", String(params.includeOrders));
  if (params.includePurchases !== undefined) qs.set("includePurchases", String(params.includePurchases));
  if (params.includeMarketing !== undefined) qs.set("includeMarketing", String(params.includeMarketing));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function fetchAccountingCategories(): Promise<AccountingCategoryDto[]> {
  const data = await apiRequest<AccountingCategoryDto[]>("/api/accounting/categories");
  return Array.isArray(data) ? data : [];
}

export async function createAccountingCategory(body: CreateAccountingCategoryRequest): Promise<AccountingCategoryDto> {
  return apiRequest<AccountingCategoryDto>("/api/accounting/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAccountingCategory(id: number, body: UpdateAccountingCategoryRequest): Promise<AccountingCategoryDto> {
  return apiRequest<AccountingCategoryDto>(`/api/accounting/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAccountingCategory(id: number): Promise<void> {
  await apiRequest(`/api/accounting/categories/${id}`, { method: "DELETE" });
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export async function fetchAccountingPurchases(categoryId?: number): Promise<AccountingPurchaseDto[]> {
  const qs = categoryId != null ? `?categoryId=${categoryId}` : "";
  const data = await apiRequest<AccountingPurchaseDto[]>(`/api/accounting/purchases${qs}`);
  return Array.isArray(data) ? data : [];
}

export async function createAccountingPurchase(body: CreateAccountingPurchaseRequest): Promise<AccountingPurchaseDto> {
  return apiRequest<AccountingPurchaseDto>("/api/accounting/purchases", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAccountingPurchase(id: number, body: UpdateAccountingPurchaseRequest): Promise<AccountingPurchaseDto> {
  return apiRequest<AccountingPurchaseDto>(`/api/accounting/purchases/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAccountingPurchase(id: number): Promise<void> {
  await apiRequest(`/api/accounting/purchases/${id}`, { method: "DELETE" });
}

// ─── Marketing ───────────────────────────────────────────────────────────────

export async function fetchMarketingExpenditures(): Promise<MarketingExpenditureDto[]> {
  const data = await apiRequest<MarketingExpenditureDto[]>("/api/accounting/marketing");
  return Array.isArray(data) ? data : [];
}

export async function createMarketingExpenditure(body: CreateMarketingExpenditureRequest): Promise<MarketingExpenditureDto> {
  return apiRequest<MarketingExpenditureDto>("/api/accounting/marketing", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMarketingExpenditure(id: number, body: UpdateMarketingExpenditureRequest): Promise<MarketingExpenditureDto> {
  return apiRequest<MarketingExpenditureDto>(`/api/accounting/marketing/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteMarketingExpenditure(id: number): Promise<void> {
  await apiRequest(`/api/accounting/marketing/${id}`, { method: "DELETE" });
}

// ─── Dashboard & Reports ─────────────────────────────────────────────────────

export async function fetchAccountingDashboard(from?: string, to?: string): Promise<AccountingDashboardDto> {
  const qs = buildReportQuery({ from, to });
  return apiRequest<AccountingDashboardDto>(`/api/accounting/dashboard${qs}`);
}

export async function fetchAccountingReport(params: AccountingReportParams): Promise<AccountingReportDto> {
  const qs = buildReportQuery(params);
  return apiRequest<AccountingReportDto>(`/api/accounting/report${qs}`);
}

export async function downloadAccountingReportPdf(params: AccountingReportParams): Promise<void> {
  const token = getAuthToken();
  const qs = buildReportQuery(params);
  const res = await fetch(buildApiUrl(API_BASE, `/api/accounting/report/pdf${qs}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(60_000),
  });

  if (res.status === 401) {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new CustomEvent("auth-expired"));
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `PDF download failed (${res.status})`);
  }

  const blob = await res.blob();
  const fromLabel = params.from ?? "start";
  const toLabel = params.to ?? "today";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yarne-accounting-report-${fromLabel}-${toLabel}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
