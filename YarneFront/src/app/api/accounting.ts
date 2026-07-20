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
  category: string | null;
  reorderThreshold: number;
  isActive: boolean;
  trackByItem: boolean;
  defaultLengthPerItem: number | null;
  createdAt: string;
}

export interface AccountingCurrencyDto {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

export interface ExchangeRateDto {
  id: number;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  effectiveAt: string;
}

export interface SupplierDto {
  id: number;
  name: string;
  contactInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemDto {
  id: number;
  materialId: number;
  materialName: string;
  materialUnit: string;
  quantityPurchased: number;
  quantityRemaining: number;
  unitPriceCents: number;
  totalCostCents: number;
  vatAmountCents: number;
  baseUnitPriceCents: number;
  baseTotalCostCents: number;
  baseVatAmountCents: number;
  itemCount: number | null;
  lengthPerItem: number | null;
  rollPriceCents: number | null;
  wholeItemsRemaining: number | null;
  partialRemainder: number | null;
}

export interface PurchaseOrderDto {
  id: number;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  invoiceRef: string | null;
  status: "draft" | "received" | "cancelled";
  receiptUrl: string | null;
  currencyCode: string;
  exchangeRateToBase: number;
  totalCostCents: number;
  vatAmountCents: number;
  baseTotalCostCents: number;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemDto[];
}

export interface CloudinaryUploadSignatureDto {
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
  folder: string;
  timestamp: number;
  signature: string;
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
  trackByItem: boolean;
  wholeItemsRemaining: number;
  looseRemainder: number;
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

export type CreateMaterialRequest = {
  name: string;
  description?: string | null;
  unit?: string;
  sku?: string | null;
  category?: string | null;
  reorderThreshold?: number;
  isActive?: boolean;
  trackByItem?: boolean;
  defaultLengthPerItem?: number | null;
};
export type UpdateMaterialRequest = CreateMaterialRequest;

export type SaveSupplierRequest = { name: string; contactInfo?: string | null };

export type SavePurchaseOrderRequest = {
  supplierId: number;
  orderDate: string;
  invoiceRef?: string | null;
  status: "draft" | "received" | "cancelled";
  receiptUrl?: string | null;
  currencyCode: string;
  exchangeRateToBase: number;
  items: {
    materialId: number;
    quantityPurchased: number;
    unitPriceCents: number;
    vatAmountCents: number;
    itemCount?: number | null;
    lengthPerItem?: number | null;
    rollPriceCents?: number | null;
  }[];
};

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

// ─── Procurement ─────────────────────────────────────────────────────────────

export async function fetchAccountingCurrencies(): Promise<AccountingCurrencyDto[]> {
  const data = await apiRequest<AccountingCurrencyDto[]>("/api/accounting/currencies");
  return Array.isArray(data) ? data : [];
}

export async function fetchExchangeRates(): Promise<ExchangeRateDto[]> {
  const data = await apiRequest<ExchangeRateDto[]>("/api/accounting/exchange-rates");
  return Array.isArray(data) ? data : [];
}

export async function createExchangeRate(body: {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  effectiveAt: string;
}): Promise<ExchangeRateDto> {
  return apiRequest<ExchangeRateDto>("/api/accounting/exchange-rates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchSuppliers(): Promise<SupplierDto[]> {
  const data = await apiRequest<SupplierDto[]>("/api/accounting/suppliers");
  return Array.isArray(data) ? data : [];
}

export async function createSupplier(body: SaveSupplierRequest): Promise<SupplierDto> {
  return apiRequest<SupplierDto>("/api/accounting/suppliers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSupplier(id: number, body: SaveSupplierRequest): Promise<SupplierDto> {
  return apiRequest<SupplierDto>(`/api/accounting/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function voidSupplier(id: number): Promise<void> {
  await apiRequest(`/api/accounting/suppliers/${id}`, { method: "DELETE" });
}

export async function fetchPurchaseOrders(from?: string, to?: string): Promise<PurchaseOrderDto[]> {
  const data = await apiRequest<PurchaseOrderDto[]>(`/api/accounting/purchase-orders${buildDateQuery(from, to)}`);
  return Array.isArray(data) ? data : [];
}

export async function createPurchaseOrder(body: SavePurchaseOrderRequest): Promise<PurchaseOrderDto> {
  return apiRequest<PurchaseOrderDto>("/api/accounting/purchase-orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePurchaseOrder(id: number, body: SavePurchaseOrderRequest): Promise<PurchaseOrderDto> {
  return apiRequest<PurchaseOrderDto>(`/api/accounting/purchase-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function voidPurchaseOrder(id: number): Promise<void> {
  await apiRequest(`/api/accounting/purchase-orders/${id}`, { method: "DELETE" });
}

export async function uploadAccountingReceipt(file: File): Promise<string> {
  const signature = await apiRequest<CloudinaryUploadSignatureDto>(
    "/api/accounting/uploads/cloudinary-signature",
    { method: "POST" },
  );
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signature.apiKey);
  form.set("timestamp", String(signature.timestamp));
  form.set("signature", signature.signature);
  form.set("upload_preset", signature.uploadPreset);
  form.set("folder", signature.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
    { method: "POST", body: form },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.secure_url !== "string") {
    throw new Error(payload?.error?.message ?? "Receipt upload failed.");
  }
  return payload.secure_url;
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

// ─── Product accounting (Phase 3) ────────────────────────────────────────────

export interface ProductBomItemDto {
  id: number;
  materialId: number;
  materialName: string;
  materialUnit: string;
  quantityRequired: number;
  latestBaseUnitPriceCents: number | null;
  currentLineCostCents: number | null;
}

export interface ProductBomDto {
  id: number;
  labourCostCents: number;
  currencyCode: string;
  items: ProductBomItemDto[];
}

export interface ProductMarginDto {
  costAvailable: boolean;
  currentBomCostCents: number | null;
  sellingPriceBaseCents: number | null;
  currentMarginPct: number | null;
  thresholdPct: number;
  isFlagged: boolean;
  missingMaterialNames: string[];
}

export interface ProductSaleComponentDto {
  id: number;
  componentProductId: number;
  componentProductName: string;
  componentProductSku: string;
  quantity: number;
  condition: "with_lace" | "always";
  componentSellingPriceCents: number;
  componentSellingCurrencyCode: string;
  colorId: number | null;
  colorName: string | null;
  colorHex: string | null;
}

export interface AccountingProductDto {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  sellingPriceCents: number;
  sellingCurrencyCode: string;
  marginThresholdPct: number;
  isInternalComponent: boolean;
  lace: boolean;
  bom: ProductBomDto | null;
  margin: ProductMarginDto;
  /** @deprecated Per-bag "Sale recipe" is retired in favor of the global Color -> lace product
   * mapping (Colors admin tab). Kept only because the backend projection stays dormant. */
  saleComponents: ProductSaleComponentDto[];
}

export type SetInternalComponentRequest = {
  isInternalComponent: boolean;
};

export type UpdateProductAccountingRequest = {
  sellingPriceCents: number;
  sellingCurrencyCode: string;
  marginThresholdPct: number;
};

export type SaveProductBomRequest = {
  labourCostCents: number;
  currencyCode: string;
  items: { materialId: number; quantityRequired: number }[];
};

// ─── Production (Phase 4) ────────────────────────────────────────────────────

export interface ProductionConsumptionDto {
  id: number;
  purchaseOrderItemId: number;
  materialId: number;
  materialName: string;
  quantityUsed: number;
  unitCostAtUseCents: number;
  totalCostCents: number;
}

export interface ProductionLotDto {
  id: number;
  quantityProduced: number;
  quantityRemaining: number;
  unitCostCents: number;
  colorId: number | null;
  colorName: string | null;
  sizeId: number | null;
  sizeName: string | null;
  lace: boolean;
}

export interface ProductionOrderDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantityProduced: number;
  quantityRejected: number;
  quantityAddedToStock: number;
  productionDate: string;
  totalMaterialCostCents: number;
  totalLabourCostCents: number;
  totalCogsCents: number;
  scrapCostCents: number;
  status: string;
  notes: string | null;
  createdAt: string;
  materialConsumptions: ProductionConsumptionDto[];
  lots: ProductionLotDto[];
}

export type CreateProductionOrderRequest = {
  productId: number;
  quantityProduced: number;
  quantityRejected: number;
  productionDate: string;
  notes?: string | null;
  colorId?: number | null;
  sizeId?: number | null;
  lace?: boolean;
};

export interface FinishedGoodsStockLotDto {
  lotId: number;
  productionOrderId: number;
  productionDate: string;
  quantityProduced: number;
  quantityRemaining: number;
  appliedToStorefrontQuantity: number;
  unitCostCents: number;
  colorId: number | null;
  colorName: string | null;
  sizeId: number | null;
  sizeName: string | null;
  lace: boolean;
  marginPct: number | null;
}

export interface FinishedGoodsStockProductDto {
  productId: number;
  productName: string;
  productSku: string;
  sellingPriceCents: number;
  sellingCurrencyCode: string;
  totalQuantityRemaining: number;
  lots: FinishedGoodsStockLotDto[];
}

export interface VariantProducedAvailabilityDto {
  colorId: number;
  sizeId: number;
  lace: boolean;
  availableQuantity: number;
}

export type ApplyVariantStockRequest = {
  productId: number;
  colorId: number;
  sizeId: number;
  lace: boolean;
  quantity: number;
};

export interface ApplyVariantStockResultDto {
  variantQuantityInStock: number;
  remainingAvailableQuantity: number;
}

// ─── Sales (Phase 5) ─────────────────────────────────────────────────────────

export interface AccountingCustomerDto {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
}

export type SaveAccountingCustomerRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryId?: number | null;
};

export interface SalesChannelDto {
  id: number;
  name: string;
  feeType: string;
  feePercentage: number;
  feeFlatCents: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
}

export type SaveSalesChannelRequest = {
  name: string;
  feeType: string;
  feePercentage: number;
  feeFlatCents: number;
  currencyCode: string;
};

export interface AccountingSalesOrderItemDto {
  id: number;
  productId: number;
  parentOrderItemId: number | null;
  productName: string;
  productSku: string;
  quantity: number;
  listedPriceCents: number;
  listedTotalCents: number;
  channelFeeShareCents: number;
  netTotalCents: number;
  unitCogsCents: number;
  totalCogsCents: number;
  vatAmountCents: number;
}

export interface AccountingSalesOrderDto {
  id: number;
  customerId: number;
  customerName: string;
  channelId: number | null;
  channelName: string;
  orderDate: string;
  status: string;
  currencyCode: string;
  exchangeRateToBase: number;
  listedRevenueCents: number;
  channelFeeCents: number;
  netRevenueCents: number;
  totalCogsCents: number;
  vatAmountCents: number;
  isChannelFeeOverridden: boolean;
  createdAt: string;
  updatedAt: string;
  items: AccountingSalesOrderItemDto[];
}

export type CreateAccountingSalesOrderItemRequest = {
  productId: number;
  quantity: number;
  listedPriceCents?: number | null;
  vatAmountCents: number;
  withLace?: boolean;
  laceColorId?: number | null;
};

export type CreateAccountingSalesOrderRequest = {
  customerId: number;
  channelId: number;
  orderDate: string;
  currencyCode: string;
  exchangeRateToBase?: number | null;
  channelFeeCents?: number | null;
  items: CreateAccountingSalesOrderItemRequest[];
};

// ─── Returns (Phase 6) ───────────────────────────────────────────────────────

export interface ReturnOrderItemDto {
  id: number;
  salesOrderItemId: number;
  productId: number;
  productName: string;
  quantity: number;
  refundAmountCents: number;
  vatReversedCents: number;
  cogsReversedCents: number;
  feeReversedCents: number;
  materialsReclaimedCents: number;
}

export interface ReturnOrderDto {
  id: number;
  salesOrderId: number;
  returnDate: string;
  reason: string;
  resolution: string;
  refundAmountCents: number;
  currencyCode: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReturnOrderItemDto[];
}

export type CreateReturnOrderRequest = {
  salesOrderId: number;
  returnDate: string;
  reason: string;
  resolution: string;
  refundAmountCents: number;
  notes?: string | null;
  items: { salesOrderItemId: number; quantity: number }[];
};

// ─── Operating expenses (Phase 7) ────────────────────────────────────────────

export interface OperatingExpenseCategoryDto {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingExpenseDto {
  id: number;
  categoryId: number;
  categoryName: string;
  date: string;
  amountCents: number;
  vatAmountCents: number;
  baseAmountCents: number;
  baseVatAmountCents: number;
  currencyCode: string;
  exchangeRateToBase: number;
  vendor: string | null;
  description: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type SaveOperatingExpenseCategoryRequest = { name: string };

export type SaveOperatingExpenseRequest = {
  categoryId: number;
  date: string;
  amountCents: number;
  vatAmountCents: number;
  currencyCode: string;
  exchangeRateToBase?: number | null;
  vendor?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  receiptUrl?: string | null;
};

// ─── Reports v3 (Phase 8) ────────────────────────────────────────────────────

export interface ProfitAndLossDto {
  listedRevenueCents: number;
  refundsCents: number;
  revenueCents: number;
  channelFeesCents: number;
  netRevenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  scrapCostCents: number;
  operatingExpensesCents: number;
  netProfitCents: number;
}

export interface VatSummaryDto {
  outputVatCollectedCents: number;
  outputVatReversedCents: number;
  netOutputVatCents: number;
  purchaseInputVatCents: number;
  expenseInputVatCents: number;
  totalInputVatCents: number;
  vatPayableCents: number;
}

export interface InventoryValuationDto {
  rawMaterialValueCents: number;
  finishedGoodsValueCents: number;
  totalValueCents: number;
  finishedGoodsPotentialRevenueCents: number;
}

export interface ReturnSummaryDto {
  completedReturns: number;
  unitsReturned: number;
  refundTotalCents: number;
  restockedUnits: number;
  writtenOffUnits: number;
  returnRatePct: number;
}

export interface AccountingDashboardV3Dto {
  dateFrom: string | null;
  dateTo: string | null;
  baseCurrencyCode: string;
  profitAndLoss: ProfitAndLossDto;
  vat: VatSummaryDto;
  inventoryValuation: InventoryValuationDto;
  returns: ReturnSummaryDto;
  productMargins: AccountingProductDto[];
  lowStockAlerts: {
    materialId: number;
    materialName: string;
    unit: string;
    quantityOnHand: number;
    reorderThreshold: number;
  }[];
  rawMaterialLots: {
    purchaseOrderItemId: number;
    purchaseOrderId: number;
    materialId: number;
    materialName: string;
    unit: string;
    supplierName: string;
    orderDate: string;
    quantityPurchased: number;
    quantityRemaining: number;
    baseUnitPriceCents: number;
    valueCents: number;
  }[];
  finishedGoods: {
    productId: number;
    productName: string;
    sku: string;
    quantityOnHand: number;
    averageUnitCostCents: number;
    valueCents: number;
  }[];
  materialPriceHistory: {
    materialId: number;
    materialName: string;
    supplierId: number;
    supplierName: string;
    orderDate: string;
    baseUnitPriceCents: number;
  }[];
  materialUsage: {
    materialId: number;
    materialName: string;
    unit: string;
    quantityUsed: number;
    costCents: number;
  }[];
  cogsByProduct: {
    productId: number;
    productName: string;
    quantitySold: number;
    cogsCents: number;
  }[];
  salesByChannel: {
    channelId: number | null;
    channelName: string;
    orderCount: number;
    listedRevenueCents: number;
    refundsCents: number;
    channelFeesCents: number;
    netRevenueCents: number;
    cogsCents: number;
    marginCents: number;
  }[];
  salesByCustomer: {
    customerId: number;
    customerName: string;
    orderCount: number;
    listedRevenueCents: number;
    netRevenueCents: number;
  }[];
  salesByProduct: {
    productId: number;
    productName: string;
    quantitySold: number;
    listedRevenueCents: number;
    netRevenueCents: number;
    cogsCents: number;
    marginCents: number;
  }[];
  expensesByCategory: {
    categoryId: number;
    categoryName: string;
    expenseCount: number;
    amountCents: number;
    vatAmountCents: number;
  }[];
}

// ─── Product accounting API ──────────────────────────────────────────────────

export async function fetchAccountingProducts(): Promise<AccountingProductDto[]> {
  const data = await apiRequest<AccountingProductDto[]>("/api/accounting/products");
  return Array.isArray(data) ? data : [];
}

export async function fetchAccountingProduct(id: number): Promise<AccountingProductDto> {
  return apiRequest<AccountingProductDto>(`/api/accounting/products/${id}`);
}

export async function updateProductPricing(
  id: number,
  body: UpdateProductAccountingRequest,
): Promise<AccountingProductDto> {
  return apiRequest<AccountingProductDto>(`/api/accounting/products/${id}/pricing`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function updateProductBom(
  id: number,
  body: SaveProductBomRequest,
): Promise<AccountingProductDto> {
  return apiRequest<AccountingProductDto>(`/api/accounting/products/${id}/bom`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function setProductInternalComponent(
  id: number,
  body: SetInternalComponentRequest,
): Promise<AccountingProductDto> {
  return apiRequest<AccountingProductDto>(`/api/accounting/products/${id}/internal-component`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ─── Production API ──────────────────────────────────────────────────────────

export async function fetchProductionOrders(from?: string, to?: string): Promise<ProductionOrderDto[]> {
  const data = await apiRequest<ProductionOrderDto[]>(
    `/api/accounting/production-orders${buildDateQuery(from, to)}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function createProductionOrder(
  body: CreateProductionOrderRequest,
): Promise<ProductionOrderDto> {
  return apiRequest<ProductionOrderDto>("/api/accounting/production-orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function voidProductionOrder(id: number): Promise<void> {
  await apiRequest(`/api/accounting/production-orders/${id}`, { method: "DELETE" });
}

export async function fetchFinishedGoodsStock(): Promise<FinishedGoodsStockProductDto[]> {
  const data = await apiRequest<FinishedGoodsStockProductDto[]>(
    "/api/accounting/production-orders/finished-goods-stock",
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchVariantProducedAvailability(
  productId: number,
): Promise<VariantProducedAvailabilityDto[]> {
  const data = await apiRequest<VariantProducedAvailabilityDto[]>(
    `/api/accounting/production-orders/variant-availability/${productId}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function applyVariantStock(
  body: ApplyVariantStockRequest,
): Promise<ApplyVariantStockResultDto> {
  return apiRequest<ApplyVariantStockResultDto>(
    "/api/accounting/production-orders/apply-variant-stock",
    { method: "POST", body: JSON.stringify(body) },
  );
}

// ─── Sales API ───────────────────────────────────────────────────────────────

export async function fetchAccountingCustomers(): Promise<AccountingCustomerDto[]> {
  const data = await apiRequest<AccountingCustomerDto[]>("/api/accounting/customers");
  return Array.isArray(data) ? data : [];
}

export async function createAccountingCustomer(
  body: SaveAccountingCustomerRequest,
): Promise<AccountingCustomerDto> {
  return apiRequest<AccountingCustomerDto>("/api/accounting/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAccountingCustomer(
  id: number,
  body: SaveAccountingCustomerRequest,
): Promise<AccountingCustomerDto> {
  return apiRequest<AccountingCustomerDto>(`/api/accounting/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function voidAccountingCustomer(id: number): Promise<void> {
  await apiRequest(`/api/accounting/customers/${id}`, { method: "DELETE" });
}

export async function fetchSalesChannels(): Promise<SalesChannelDto[]> {
  const data = await apiRequest<SalesChannelDto[]>("/api/accounting/sales-channels");
  return Array.isArray(data) ? data : [];
}

export async function createSalesChannel(body: SaveSalesChannelRequest): Promise<SalesChannelDto> {
  return apiRequest<SalesChannelDto>("/api/accounting/sales-channels", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSalesChannel(
  id: number,
  body: SaveSalesChannelRequest,
): Promise<SalesChannelDto> {
  return apiRequest<SalesChannelDto>(`/api/accounting/sales-channels/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function voidSalesChannel(id: number): Promise<void> {
  await apiRequest(`/api/accounting/sales-channels/${id}`, { method: "DELETE" });
}

export async function fetchSalesOrders(from?: string, to?: string): Promise<AccountingSalesOrderDto[]> {
  const data = await apiRequest<AccountingSalesOrderDto[]>(
    `/api/accounting/sales-orders${buildDateQuery(from, to)}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function createSalesOrder(
  body: CreateAccountingSalesOrderRequest,
): Promise<AccountingSalesOrderDto> {
  return apiRequest<AccountingSalesOrderDto>("/api/accounting/sales-orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function voidSalesOrder(id: number): Promise<void> {
  await apiRequest(`/api/accounting/sales-orders/${id}`, { method: "DELETE" });
}

// ─── Returns API ─────────────────────────────────────────────────────────────

export async function fetchReturns(from?: string, to?: string): Promise<ReturnOrderDto[]> {
  const data = await apiRequest<ReturnOrderDto[]>(
    `/api/accounting/returns${buildDateQuery(from, to)}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function createReturn(body: CreateReturnOrderRequest): Promise<ReturnOrderDto> {
  return apiRequest<ReturnOrderDto>("/api/accounting/returns", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function completeReturn(id: number): Promise<ReturnOrderDto> {
  return apiRequest<ReturnOrderDto>(`/api/accounting/returns/${id}/complete`, { method: "POST" });
}

export async function voidReturn(id: number): Promise<void> {
  await apiRequest(`/api/accounting/returns/${id}`, { method: "DELETE" });
}

// ─── Operating expenses API ──────────────────────────────────────────────────

export async function fetchOperatingExpenseCategories(): Promise<OperatingExpenseCategoryDto[]> {
  const data = await apiRequest<OperatingExpenseCategoryDto[]>(
    "/api/accounting/operating-expense-categories",
  );
  return Array.isArray(data) ? data : [];
}

export async function createOperatingExpenseCategory(
  body: SaveOperatingExpenseCategoryRequest,
): Promise<OperatingExpenseCategoryDto> {
  return apiRequest<OperatingExpenseCategoryDto>("/api/accounting/operating-expense-categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateOperatingExpenseCategory(
  id: number,
  body: SaveOperatingExpenseCategoryRequest,
): Promise<OperatingExpenseCategoryDto> {
  return apiRequest<OperatingExpenseCategoryDto>(
    `/api/accounting/operating-expense-categories/${id}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export async function voidOperatingExpenseCategory(id: number): Promise<void> {
  await apiRequest(`/api/accounting/operating-expense-categories/${id}`, { method: "DELETE" });
}

export async function fetchOperatingExpenses(
  from?: string,
  to?: string,
  categoryId?: number,
): Promise<OperatingExpenseDto[]> {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (categoryId != null) qs.set("categoryId", String(categoryId));
  const s = qs.toString();
  const data = await apiRequest<OperatingExpenseDto[]>(
    `/api/accounting/operating-expenses${s ? `?${s}` : ""}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function createOperatingExpense(
  body: SaveOperatingExpenseRequest,
): Promise<OperatingExpenseDto> {
  return apiRequest<OperatingExpenseDto>("/api/accounting/operating-expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateOperatingExpense(
  id: number,
  body: SaveOperatingExpenseRequest,
): Promise<OperatingExpenseDto> {
  return apiRequest<OperatingExpenseDto>(`/api/accounting/operating-expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function voidOperatingExpense(id: number): Promise<void> {
  await apiRequest(`/api/accounting/operating-expenses/${id}`, { method: "DELETE" });
}

// ─── Reports v3 API ──────────────────────────────────────────────────────────

export async function fetchAccountingDashboardV3(
  from?: string,
  to?: string,
): Promise<AccountingDashboardV3Dto> {
  return apiRequest<AccountingDashboardV3Dto>(
    `/api/accounting/v3/reports/dashboard${buildDateQuery(from, to)}`,
  );
}
