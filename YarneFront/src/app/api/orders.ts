import { apiRequest } from "./client";

export interface OrderItemDto {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  productImageUrl: string | null;
  productSubtitle: string | null;
  colorName: string | null;
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
  customerId: number;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  orderDate: string;
  estimatedDelivery: string | null;
  paymentMethodId: number;
  paymentMethodName: string;
  shippingAddrId: number | null;
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
  sizeName?: string;
  withLace?: boolean | null;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  paymentMethodId?: number;
  shippingAddrId?: number;
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
