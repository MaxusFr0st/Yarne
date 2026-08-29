import { apiRequest } from "./client";

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
  countryId: number | null;
  countryName: string | null;
}

export interface OrderDto {
  id: number;
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
