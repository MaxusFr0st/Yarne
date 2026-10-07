import { apiRequest } from "./client";
import { buildApiUrl, resolveApiBase } from "./base";

export interface OrderItemDto {
  id: number;
  productId: number | null;
  parentOrderItemId: number | null;
  productCode: string;
  productName: string;
  productImageUrl: string | null;
  productSubtitle: string | null;
  colorName: string | null;
  furnitureColorName: string | null;
  sizeName: string | null;
  withLace: boolean | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** EUR snapshot at purchase time. Null for orders placed before EUR pricing existed. */
  eurUnitPrice?: number | null;
  eurLineTotal?: number | null;
  countryId: number | null;
  countryName: string | null;
}

/** Sum of eurLineTotal across every item, or null if any item lacks a EUR snapshot (older order). */
export function orderEurTotal(order: { items: OrderItemDto[] }): number | null {
  if (order.items.length === 0) return null;
  if (order.items.some((i) => i.eurUnitPrice == null)) return null;
  return order.items.reduce((sum, i) => sum + (i.eurLineTotal ?? i.eurUnitPrice! * i.quantity), 0);
}

export interface OrderDto {
  id: number;
  /** The public number the customer quotes ("Y071026-3"); null for an order placed by hand in the admin. */
  orderNumber?: string | null;
  /** Opens the order's public status page (/order/{token}). */
  statusToken?: string | null;
  statusUrl?: string | null;
  paymentChoice?: "Transfer" | "Pickup" | null;
  cancelReason?: string | null;
  isForeignDelivery?: boolean;
  paymentReceivedAt?: string | null;
  receiptUploadedAt?: string | null;
  deliveryCountryCode?: string | null;
  deliveryCountryName?: string | null;
  deliveryCarrier?: "NovaPost" | "Other" | null;
  deliveryPostalCode?: string | null;
  deliveryAddress?: string | null;
  locale?: string | null;
  customerId: number | null;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber: string | null;
  total: number;
  status: string;
  orderDate: string;
  estimatedDelivery: string | null;
  paymentMethodId: number;
  paymentMethodName: string;
  shippingAddrId: number | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientPhone: string | null;
  deliveryCityRef: string | null;
  deliveryCityName: string | null;
  deliveryWarehouseRef: string | null;
  deliveryWarehouseName: string | null;
  ttnNumber: string | null;
  ttnCreatedAt: string | null;
  trackingStatus: string | null;
  trackingCheckedAt: string | null;
  items: OrderItemDto[];
}

export interface AdminOrdersSummaryDto {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

export interface CreateOrderItemRequest {
  productIdOrCode: string;
  quantity: number;
  countryId?: number;
  productSubtitle?: string;
  colorName?: string;
  colorId?: number;
  furnitureColorName?: string;
  sizeName?: string;
  withLace?: boolean | null;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  /** Storefront UI language at checkout ("en"/"uk") — lets order emails show EUR alongside hryvnia. */
  locale?: string;
  phoneNumber: string;
  /** Required for guest checkout (no logged-in customer). */
  email?: string;
  paymentMethodId?: number;
  shippingAddrId?: number;
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone: string;
  deliveryCityRef: string;
  deliveryCityName: string;
  deliveryWarehouseRef: string;
  deliveryWarehouseName: string;
  /** Delivery abroad: no Nova Poshta checks, payment by transfer only. */
  isForeignDelivery?: boolean;
  deliveryCountryCode?: string;
  deliveryCountryName?: string;
  /** "NovaPost" (branch id in deliveryWarehouseRef) or "Other" (typed address). */
  deliveryCarrier?: "NovaPost" | "Other";
  deliveryPostalCode?: string;
  deliveryAddress?: string;
}

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "InProduction"
  | "Made"
  | "Shipped"
  | "Received"
  | "Canceled";

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  estimatedDelivery?: string | null;
  /** Shown to the customer when declining (moving to Canceled). */
  cancelReason?: string | null;
}

export async function fetchMyOrders(): Promise<OrderDto[]> {
  return apiRequest<OrderDto[]>("/api/orders/my");
}

export async function trackOrderByTtn(ttn: string): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/track?ttn=${encodeURIComponent(ttn)}`);
}

export async function fetchAdminOrders(): Promise<OrderDto[]> {
  return apiRequest<OrderDto[]>("/api/orders");
}

export async function fetchAdminOrdersSummary(): Promise<AdminOrdersSummaryDto> {
  return apiRequest<AdminOrdersSummaryDto>("/api/orders/summary");
}

export async function createOrder(payload: CreateOrderRequest): Promise<OrderDto> {
  return apiRequest<OrderDto>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrderStatus(orderId: number, payload: UpdateOrderStatusRequest): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface CreateWaybillRequest {
  senderProfileId?: string;
  senderCityRef?: string;
  senderWarehouseRef?: string;
}

export interface NovaPoshtaSenderProfile {
  id: string;
  label: string;
  isDefault: boolean;
  defaultCityRef: string | null;
  defaultCityName: string | null;
  defaultWarehouseRef: string | null;
  defaultWarehouseName: string | null;
}

export async function fetchNovaPoshtaSenders(): Promise<NovaPoshtaSenderProfile[]> {
  return apiRequest<NovaPoshtaSenderProfile[]>("/api/orders/nova-poshta/senders");
}

export async function createOrderWaybill(orderId: number, payload?: CreateWaybillRequest): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/ttn`, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function refreshOrderTracking(orderId: number): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/tracking`, { method: "POST" });
}

export async function cancelOrderWaybill(orderId: number): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/ttn`, { method: "DELETE" });
}

export async function fetchNovaPoshtaShippingPrice(cityRef: string, cost: number): Promise<number> {
  return apiRequest<number>(
    `/api/orders/nova-poshta/shipping-price?cityRef=${encodeURIComponent(cityRef)}&cost=${encodeURIComponent(cost)}`,
  );
}

export type PaymentChoice = "Transfer" | "Pickup";

export interface TransferDetails {
  recipient: string;
  cardNumber: string;
  iban: string;
  /** What to write in the payment note, the order number already in it. */
  reference: string;
}

export interface PublicOrderStatusItem {
  productCode: string;
  productName: string;
  productImageUrl: string | null;
  colorName: string | null;
  colorNameUk: string | null;
  sizeName: string | null;
  sizeNameUk: string | null;
  withLace: boolean | null;
  furnitureColorName: string | null;
  furnitureColorNameUk: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  eurUnitPrice: number | null;
  eurLineTotal: number | null;
}

/** What the public status page may know about an order: no phone and no last name. */
export interface PublicOrderStatus {
  orderNumber: string | null;
  orderDate: string;
  status: string;
  currencyCode: string;
  total: number;
  eurTotal: number | null;
  locale: string | null;
  recipientFirstName: string | null;
  deliveryCityName: string | null;
  deliveryWarehouseName: string | null;
  ttnNumber: string | null;
  trackingStatus: string | null;
  isForeignDelivery: boolean;
  paymentChoice: PaymentChoice | null;
  paymentChoiceAt: string | null;
  canChoosePayment: boolean;
  /** Only while the choice is "Transfer": the owner's bank details, or null when none are set yet. */
  transferDetails: TransferDetails | null;
  deliveryCountryName: string | null;
  /** "NovaPost" or "Other" for a foreign order. */
  deliveryCarrier: "NovaPost" | "Other" | null;
  deliveryPostalCode: string | null;
  deliveryAddress: string | null;
  /** When the owner confirmed the bank transfer arrived. */
  paymentReceivedAt: string | null;
  /** When the customer uploaded a receipt; null when none. */
  receiptUploadedAt: string | null;
  /** A receipt may be added or replaced. */
  canUploadReceipt: boolean;
  cancelReason: string | null;
  email: string | null;
  isAttachedToAccount: boolean;
  accountExistsForEmail: boolean;
  items: PublicOrderStatusItem[];
}

export async function fetchOrderStatus(token: string): Promise<PublicOrderStatus> {
  return apiRequest<PublicOrderStatus>(`/api/orders/status/${encodeURIComponent(token)}`);
}

export async function setOrderPaymentChoice(token: string, choice: PaymentChoice): Promise<PublicOrderStatus> {
  return apiRequest<PublicOrderStatus>(`/api/orders/status/${encodeURIComponent(token)}/payment-choice`, {
    method: "POST",
    body: JSON.stringify({ choice: choice.toLowerCase() }),
  });
}

/** Adds or replaces the receipt image of a transfer payment. */
export async function uploadOrderReceipt(token: string, file: File): Promise<PublicOrderStatus> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiRequest<PublicOrderStatus>(`/api/orders/status/${encodeURIComponent(token)}/receipt`, { method: "POST", body: form });
}

export async function markOrderPaymentReceived(orderId: number): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/payment-received`, { method: "POST" });
}

export async function undoOrderPaymentReceived(orderId: number): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/payment-received`, { method: "DELETE" });
}

/** The customer's receipt image, fetched with the admin's session (it has no public address). Returns an object URL to open. */
export async function fetchOrderReceiptObjectUrl(orderId: number): Promise<string> {
  const res = await fetch(buildApiUrl(resolveApiBase(), `/api/orders/${orderId}/receipt`), { credentials: "include" });
  if (!res.ok) throw new Error("The receipt could not be loaded.");
  return URL.createObjectURL(await res.blob());
}

export async function setOrderForeignDelivery(orderId: number, isForeignDelivery: boolean): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/foreign-delivery`, { method: "PATCH", body: JSON.stringify({ isForeignDelivery }) });
}

export async function setOrderManualTtn(orderId: number, ttnNumber: string | null): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/api/orders/${orderId}/manual-ttn`, { method: "PUT", body: JSON.stringify({ ttnNumber }) });
}
