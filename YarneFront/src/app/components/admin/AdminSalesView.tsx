import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ChevronDown, ChevronUp, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import {
  createAccountingCustomer,
  createSalesChannel,
  createSalesOrder,
  fetchAccountingCurrencies,
  fetchAccountingCustomers,
  fetchAccountingProducts,
  fetchExchangeRates,
  fetchSalesChannels,
  fetchSalesOrders,
  updateSalesChannel,
  voidSalesChannel,
  voidSalesOrder,
  type AccountingCustomerDto,
  type AccountingProductDto,
  type AccountingSalesOrderDto,
  type SalesChannelDto,
} from "../../api/accounting";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorBanner,
  Label,
  Panel,
  StatusPill,
  centsFromInput,
  controlClass,
  dateOnly,
  formatLocalDate,
  inputFromCents,
  localIsoDate,
  moneyFromCents,
  toApiDate,
} from "./accountingAdminUi";

type SalesLine = {
  productId: number;
  quantity: string;
  listedPrice: string;
  vat: string;
  withLace: boolean;
  laceColorId: number | null;
};

const BASE_CURRENCY = "UAH";

/** Prefill listed price in the order currency from the product's selling price.
 *  Returns null when conversion is ambiguous so the field stays blank and the
 *  server performs the authoritative currency conversion. */
function toDisplayCents(
  sellingPriceCents: number,
  sellingCurrencyCode: string,
  orderCurrencyCode: string,
  exchangeRate: string,
): number | null {
  const selling = sellingCurrencyCode.trim().toUpperCase() || BASE_CURRENCY;
  const order = orderCurrencyCode.trim().toUpperCase() || BASE_CURRENCY;
  // Same currency — use the product price as-is.
  if (selling === order) return sellingPriceCents;
  // Only auto-convert the common UAH → foreign case when the admin entered a rate.
  // Any other pair (EUR→UAH, EUR→USD, …) is left blank for the server.
  if (selling === BASE_CURRENCY && order !== BASE_CURRENCY) {
    const rate = Number(exchangeRate);
    if (!rate || rate <= 0) return null;
    return Math.round(sellingPriceCents / rate);
  }
  return null;
}

function estimateChannelFee(
  channel: SalesChannelDto | undefined,
  listedTotalCents: number,
): number {
  if (!channel || channel.feeType === "none") return 0;
  if (channel.feeType === "flat") return channel.feeFlatCents;
  if (channel.feeType === "percentage") {
    return Math.round((listedTotalCents * Number(channel.feePercentage)) / 100);
  }
  // percentage_plus_flat or similar
  return Math.round((listedTotalCents * Number(channel.feePercentage)) / 100) + channel.feeFlatCents;
}

export function AdminSalesView({ mode }: { mode: "channels" | "sales" }) {
  const [channels, setChannels] = useState<SalesChannelDto[]>([]);
  const [orders, setOrders] = useState<AccountingSalesOrderDto[]>([]);
  const [products, setProducts] = useState<AccountingProductDto[]>([]);
  const [customers, setCustomers] = useState<AccountingCustomerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [channelModal, setChannelModal] = useState<SalesChannelDto | "new" | null>(null);
  const [channelForm, setChannelForm] = useState({
    name: "",
    feeType: "none",
    feePercentage: "0",
    feeFlat: "0",
    currencyCode: "UAH",
  });
  const [voidChannelId, setVoidChannelId] = useState<number | null>(null);

  const [orderModal, setOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerId: 0,
    channelId: 0,
    orderDate: localIsoDate(),
    currencyCode: BASE_CURRENCY,
    exchangeRate: "",
    overrideFee: false,
    channelFee: "",
    lines: [{ productId: 0, quantity: "1", listedPrice: "", vat: "0", withLace: false, laceColorId: null }] as SalesLine[],
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });
  const [voidOrderId, setVoidOrderId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "channels") {
        setChannels(await fetchSalesChannels());
      } else {
        const [nextOrders, nextChannels, nextProducts, nextCustomers, currencies] = await Promise.all([
          fetchSalesOrders(),
          fetchSalesChannels(),
          fetchAccountingProducts(),
          fetchAccountingCustomers(),
          fetchAccountingCurrencies(),
          fetchExchangeRates(),
        ]);
        setOrders(nextOrders);
        setChannels(nextChannels);
        setProducts(nextProducts);
        setCustomers(nextCustomers);
        const base = currencies.find((c) => c.isBase)?.code ?? "UAH";
        setOrderForm((current) => ({
          ...current,
          currencyCode: current.currencyCode || base,
        }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load sales data.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 40);
    return customers
      .filter((customer) => {
        const label = `${customer.name} ${customer.email} ${customer.address ?? ""}`.toLowerCase();
        return label.includes(q);
      })
      .slice(0, 40);
  }, [customers, customerQuery]);

  // Lines with a blank listed price are unpriced (server will resolve them) — excluding
  // them from the sum keeps the preview from silently understating the total as if
  // those lines were free, and callers can surface `unpricedLineCount` to warn the admin.
  const { listedTotalCents, unpricedLineCount } = useMemo(() => {
    let total = 0;
    let unpriced = 0;
    for (const line of orderForm.lines) {
      const qty = Number(line.quantity) || 0;
      if (!line.listedPrice) {
        unpriced += 1;
        continue;
      }
      total += qty * centsFromInput(line.listedPrice);
    }
    return { listedTotalCents: total, unpricedLineCount: unpriced };
  }, [orderForm.lines]);

  const selectedChannel = channels.find((c) => c.id === orderForm.channelId);
  const autoFee = estimateChannelFee(selectedChannel, listedTotalCents);

  const openChannel = (channel: SalesChannelDto | "new") => {
    setChannelForm({
      name: channel === "new" ? "" : channel.name,
      feeType: channel === "new" ? "none" : channel.feeType,
      feePercentage: channel === "new" ? "0" : String(channel.feePercentage),
      feeFlat: channel === "new" ? "0" : inputFromCents(channel.feeFlatCents),
      currencyCode: channel === "new" ? "UAH" : channel.currencyCode,
    });
    setChannelModal(channel);
  };

  const saveChannel = async () => {
    if (!channelForm.name.trim()) {
      setError("Channel name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: channelForm.name.trim(),
        feeType: channelForm.feeType,
        feePercentage: Number(channelForm.feePercentage) || 0,
        feeFlatCents: centsFromInput(channelForm.feeFlat),
        currencyCode: channelForm.currencyCode.trim() || "UAH",
      };
      if (channelModal === "new") await createSalesChannel(body);
      else if (channelModal) await updateSalesChannel(channelModal.id, body);
      setChannelModal(null);
      setChannels(await fetchSalesChannels());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save channel.");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoidChannel = async () => {
    if (voidChannelId == null) return;
    setSaving(true);
    setError(null);
    try {
      await voidSalesChannel(voidChannelId);
      setVoidChannelId(null);
      setChannels(await fetchSalesChannels());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not void channel.");
    } finally {
      setSaving(false);
    }
  };

  const openOrder = () => {
    const firstProduct = products[0];
    const defaultCurrency = BASE_CURRENCY;
    const defaultRate = ""; // empty = let server resolve the rate

    const autoPrice =
      firstProduct != null
        ? toDisplayCents(
            firstProduct.sellingPriceCents,
            firstProduct.sellingCurrencyCode,
            defaultCurrency,
            defaultRate,
          )
        : null;

    setOrderForm({
      customerId: customers[0]?.id ?? 0,
      channelId: channels[0]?.id ?? 0,
      orderDate: localIsoDate(),
      currencyCode: defaultCurrency,
      exchangeRate: defaultRate,
      overrideFee: false,
      channelFee: "",
      lines: [{
        productId: firstProduct?.id ?? 0,
        quantity: "1",
        listedPrice: autoPrice != null ? inputFromCents(autoPrice) : "",
        vat: "0",
        withLace: false,
        laceColorId: null,
      }],
    });
    setCustomerQuery("");
    setOrderModal(true);
  };

  const updateLine = (index: number, patch: Partial<SalesLine>) => {
    setOrderForm((current) => ({
      ...current,
      lines: current.lines.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.productId != null) {
          const product = products.find((p) => p.id === patch.productId);
          if (product && !line.listedPrice) {
            const displayCents = toDisplayCents(
              product.sellingPriceCents,
              product.sellingCurrencyCode,
              current.currencyCode,
              current.exchangeRate,
            );
            next.listedPrice = displayCents != null ? inputFromCents(displayCents) : "";
          }
          // Product changed — the previous lace color selection no longer applies.
          next.laceColorId = null;
        }
        return next;
      }),
    }));
  };

  const saveOrder = async () => {
    if (!orderForm.customerId || !orderForm.channelId ||
      orderForm.lines.some((line) => !line.productId || Number(line.quantity) <= 0)) {
      setError("Customer, channel, and at least one valid line are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Only send an override when the admin has explicitly provided a valid rate for a
      // non-base currency. For UAH, or an empty/zero rate field, send null so the server
      // resolves the rate itself instead of silently recording a 1:1 conversion.
      const parsedRate = Number(orderForm.exchangeRate);
      const isBaseCurrency = orderForm.currencyCode.trim().toUpperCase() === BASE_CURRENCY;

      await createSalesOrder({
        customerId: orderForm.customerId,
        channelId: orderForm.channelId,
        orderDate: toApiDate(orderForm.orderDate),
        currencyCode: orderForm.currencyCode.trim() || BASE_CURRENCY,
        exchangeRateToBase: !isBaseCurrency && parsedRate > 0 ? parsedRate : null,
        channelFeeCents: orderForm.overrideFee ? centsFromInput(orderForm.channelFee) : null,
        items: orderForm.lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          listedPriceCents: line.listedPrice ? centsFromInput(line.listedPrice) : null,
          vatAmountCents: centsFromInput(line.vat),
          withLace: line.withLace,
          laceColorId: line.withLace ? line.laceColorId : null,
        })),
      });
      setOrderModal(false);
      setOrders(await fetchSalesOrders());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create sales order.");
    } finally {
      setSaving(false);
    }
  };

  const saveQuickCustomer = async () => {
    if (!quickCustomerForm.firstName.trim() || !quickCustomerForm.lastName.trim() || !quickCustomerForm.email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createAccountingCustomer({
        firstName: quickCustomerForm.firstName.trim(),
        lastName: quickCustomerForm.lastName.trim(),
        email: quickCustomerForm.email.trim(),
        phoneNumber: quickCustomerForm.phoneNumber.trim() || null,
      });
      const nextCustomers = await fetchAccountingCustomers();
      setCustomers(nextCustomers);
      setOrderForm((c) => ({ ...c, customerId: created.id }));
      setCustomerQuery("");
      setQuickCustomerOpen(false);
      setQuickCustomerForm({ firstName: "", lastName: "", email: "", phoneNumber: "" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create customer.");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoidOrder = async () => {
    if (voidOrderId == null) return;
    setSaving(true);
    setError(null);
    try {
      await voidSalesOrder(voidOrderId);
      setVoidOrderId(null);
      setOrders(await fetchSalesOrders());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not void sale.");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "channels") {
    return (
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Sales channels define marketplace or storefront fee rules.
          </p>
          <div className="flex gap-2">
            <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh channels">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </Button>
            <Button onClick={() => openChannel("new")}><Plus size={14} /> Add channel</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        <Panel>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
              <Loader2 size={16} className="animate-spin" /> Loading channels…
            </div>
          ) : channels.length === 0 ? (
            <EmptyState title="No channels" detail="Add Instagram, website, or marketplace channels with fee rules." />
          ) : (
            <div className="divide-y divide-[#2D241E]/08">
              {channels.map((channel) => (
                <div key={channel.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{channel.name}</p>
                    <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Fee: {channel.feeType}
                      {channel.feeType.includes("percentage") || channel.feeType === "percentage"
                        ? ` · ${channel.feePercentage}%`
                        : ""}
                      {channel.feeFlatCents > 0 ? ` · flat ${moneyFromCents(channel.feeFlatCents, channel.currencyCode)}` : ""}
                      {` · ${channel.currencyCode}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit ${channel.name}`} onClick={() => openChannel(channel)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Void ${channel.name}`} onClick={() => setVoidChannelId(channel.id)}>
                      <Ban size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {channelModal ? (
          <Dialog title={channelModal === "new" ? "New channel" : "Edit channel"} onClose={() => setChannelModal(null)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ch-name">Name</Label>
                <input id="ch-name" className={controlClass()} value={channelForm.name} onChange={(e) => setChannelForm((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ch-fee-type">Fee type</Label>
                <select id="ch-fee-type" className={controlClass()} value={channelForm.feeType} onChange={(e) => setChannelForm((c) => ({ ...c, feeType: e.target.value }))}>
                  <option value="none">None</option>
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat</option>
                  <option value="percentage_plus_flat">Percentage + flat</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ch-pct">Fee %</Label>
                  <input id="ch-pct" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={channelForm.feePercentage} onChange={(e) => setChannelForm((c) => ({ ...c, feePercentage: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="ch-flat">Flat fee</Label>
                  <input id="ch-flat" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={channelForm.feeFlat} onChange={(e) => setChannelForm((c) => ({ ...c, feeFlat: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="ch-currency">Currency</Label>
                <input id="ch-currency" className={controlClass()} value={channelForm.currencyCode} onChange={(e) => setChannelForm((c) => ({ ...c, currencyCode: e.target.value.toUpperCase() }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button tone="light" onClick={() => setChannelModal(null)}>Cancel</Button>
                <Button onClick={() => void saveChannel()} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          </Dialog>
        ) : null}

        {voidChannelId != null ? (
          <Dialog title="Void channel?" subtitle="This removes the channel from active use." onClose={() => setVoidChannelId(null)}>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setVoidChannelId(null)}>Cancel</Button>
              <Button tone="danger" onClick={() => void confirmVoidChannel()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Void
              </Button>
            </div>
          </Dialog>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Record channel sales with listed, fee, net, VAT, and COGS.
        </p>
        <div className="flex gap-2">
          <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh sales">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
          <Button onClick={openOrder} disabled={!channels.length || !products.length || !customers.length}>
            <Plus size={14} /> New sale
          </Button>
        </div>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      {!customers.length && !loading ? (
        <ErrorBanner message="No active users found for the customer picker. Create a customer account first." />
      ) : null}

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading sales…
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="No sales orders" detail="Create a sale linked to a channel and customer." />
        ) : (
          <div className="divide-y divide-[#2D241E]/08">
            {orders.map((order) => {
              const open = expanded === order.id;
              return (
                <div key={order.id} className="px-4 py-4 sm:px-5">
                  <div className="flex w-full items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex flex-1 cursor-pointer items-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                      onClick={() => setExpanded(open ? null : order.id)}
                      aria-expanded={open}
                    >
                      <div>
                        <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {order.customerName}
                        </p>
                        <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          #{order.id} · {formatLocalDate(order.orderDate)} · {order.channelName}
                          {order.isChannelFeeOverridden ? " · fee overridden" : ""}
                        </p>
                        <p className="mt-2 text-sm tabular-nums text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Listed {moneyFromCents(order.listedRevenueCents, order.currencyCode)}
                          {" · "}Fee {moneyFromCents(order.channelFeeCents, order.currencyCode)}
                          {" · "}Net {moneyFromCents(order.netRevenueCents, order.currencyCode)}
                          {" · "}VAT {moneyFromCents(order.vatAmountCents, order.currencyCode)}
                          {" · "}COGS {moneyFromCents(order.totalCogsCents, order.currencyCode)}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <StatusPill>{order.status}</StatusPill>
                      {order.status !== "Canceled" ? (
                        <Button tone="danger" onClick={() => setVoidOrderId(order.id)} disabled={saving} aria-label={`Void sale ${order.id}`}>
                          <Ban size={14} /> Void
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                        onClick={() => setExpanded(open ? null : order.id)}
                        aria-expanded={open}
                        aria-label={`Toggle details for sale ${order.id}`}
                      >
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-white/60 p-4" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                      {order.items
                        .filter((item) => item.parentOrderItemId == null)
                        .map((parent) => {
                          const children = order.items.filter((child) => child.parentOrderItemId === parent.id);
                          return (
                            <div key={parent.id} className="space-y-1">
                              <div className="flex flex-wrap justify-between gap-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <span>{parent.productName} × {parent.quantity}</span>
                                <span className="tabular-nums text-[#2D241E]/65">
                                  listed {moneyFromCents(parent.listedTotalCents, order.currencyCode)}
                                  {" · "}net {moneyFromCents(parent.netTotalCents, order.currencyCode)}
                                  {" · "}COGS {moneyFromCents(parent.totalCogsCents, order.currencyCode)}
                                </span>
                              </div>
                              {children.map((child) => (
                                <div key={child.id} className="flex flex-wrap justify-between gap-2 pl-4 text-xs text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                  <span>↳ {child.productName} × {child.quantity}</span>
                                  <span className="tabular-nums">
                                    listed {moneyFromCents(child.listedTotalCents, order.currencyCode)}
                                    {" · "}net {moneyFromCents(child.netTotalCents, order.currencyCode)}
                                    {" · "}COGS {moneyFromCents(child.totalCogsCents, order.currencyCode)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {orderModal ? (
        <Dialog title="New sales order" onClose={() => setOrderModal(false)} wide>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sale-customer-search">Customer</Label>
              <div className="mb-2 flex gap-2">
                <input
                  id="sale-customer-search"
                  className={controlClass()}
                  placeholder="Search name or email"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
                <Button tone="light" onClick={() => setQuickCustomerOpen(true)}>
                  <Plus size={14} /> New
                </Button>
              </div>
              <select
                id="sale-customer"
                className={controlClass()}
                value={orderForm.customerId || ""}
                onChange={(e) => setOrderForm((c) => ({ ...c, customerId: Number(e.target.value) }))}
                aria-label="Select customer"
              >
                <option value="">Select customer</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sale-channel">Channel</Label>
                <select id="sale-channel" className={controlClass()} value={orderForm.channelId || ""} onChange={(e) => setOrderForm((c) => ({ ...c, channelId: Number(e.target.value) }))}>
                  <option value="">Select channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>{channel.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="sale-date">Order date</Label>
                <input id="sale-date" type="date" className={controlClass()} value={dateOnly(orderForm.orderDate)} onChange={(e) => setOrderForm((c) => ({ ...c, orderDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sale-currency">Currency</Label>
                <input
                  id="sale-currency"
                  className={controlClass()}
                  value={orderForm.currencyCode}
                  onChange={(e) => {
                    const newCurrency = e.target.value.toUpperCase();
                    setOrderForm((c) => ({
                      ...c,
                      currencyCode: newCurrency,
                      // Reset the rate whenever currency changes — the admin must re-enter
                      // it for foreign currencies, or leave it blank to let the server resolve it.
                      exchangeRate: "",
                      // Clear listed prices too: they were denominated in the old currency
                      // and must be re-entered (or left blank) for the new one.
                      lines: c.lines.map((line) => ({ ...line, listedPrice: "" })),
                    }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="sale-rate">Exchange rate to base</Label>
                <input id="sale-rate" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={orderForm.exchangeRate} onChange={(e) => setOrderForm((c) => ({ ...c, exchangeRate: e.target.value }))} />
              </div>
            </div>

            <div className="rounded-2xl bg-white/50 p-4" style={{ border: "1px solid rgba(45,36,30,0.1)" }}>
              <p className="mb-2 text-sm text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Listed total <span className="tabular-nums font-medium">{moneyFromCents(listedTotalCents, orderForm.currencyCode)}</span>
                {" · "}Auto fee <span className="tabular-nums font-medium">{moneyFromCents(autoFee, orderForm.currencyCode)}</span>
                {unpricedLineCount > 0 ? (
                  <span className="ml-1 text-amber-700">
                    · {unpricedLineCount} line{unpricedLineCount > 1 ? "s" : ""} pending price — server will set on save, totals above exclude {unpricedLineCount > 1 ? "them" : "it"}
                  </span>
                ) : null}
              </p>
              <label className="mb-2 flex items-center gap-2 text-sm text-[#2D241E]/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <input
                  type="checkbox"
                  checked={orderForm.overrideFee}
                  onChange={(e) => setOrderForm((c) => ({
                    ...c,
                    overrideFee: e.target.checked,
                    channelFee: e.target.checked ? inputFromCents(autoFee) : "",
                  }))}
                  className="size-4 cursor-pointer"
                />
                Override channel fee
              </label>
              {orderForm.overrideFee ? (
                <input
                  inputMode="decimal"
                  className={`${controlClass()} tabular-nums`}
                  value={orderForm.channelFee}
                  onChange={(e) => setOrderForm((c) => ({ ...c, channelFee: e.target.value }))}
                  aria-label="Channel fee override"
                />
              ) : null}
            </div>

            <div className="space-y-3">
              {orderForm.lines.map((line, index) => {
                const lineProduct = products.find((p) => p.id === line.productId);
                // Only rows with a configured color count as selectable lace options — legacy
                // un-migrated rows (colorId == null) don't compose anything.
                const laceComponents = lineProduct?.saleComponents.filter(
                  (sc) => sc.condition === "with_lace" && sc.colorId != null,
                ) ?? [];
                const offersLace = laceComponents.length > 0;
                const selectedLaceComponent = laceComponents.find((sc) => sc.colorId === line.laceColorId) ?? null;
                const laceSurchargeCents = selectedLaceComponent
                  ? selectedLaceComponent.componentSellingPriceCents * selectedLaceComponent.quantity
                  : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <Label htmlFor={`sale-prod-${index}`}>Product</Label>
                        <select id={`sale-prod-${index}`} className={controlClass()} value={line.productId || ""} onChange={(e) => updateLine(index, { productId: Number(e.target.value), withLace: false })}>
                          <option value="">Select</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor={`sale-qty-${index}`}>Qty</Label>
                        <input id={`sale-qty-${index}`} inputMode="numeric" className={`${controlClass()} tabular-nums`} value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`sale-price-${index}`}>Listed</Label>
                        <input id={`sale-price-${index}`} inputMode="decimal" className={`${controlClass()} tabular-nums`} value={line.listedPrice} onChange={(e) => updateLine(index, { listedPrice: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`sale-vat-${index}`}>VAT</Label>
                        <input id={`sale-vat-${index}`} inputMode="decimal" className={`${controlClass()} tabular-nums`} value={line.vat} onChange={(e) => updateLine(index, { vat: e.target.value })} />
                      </div>
                    </div>
                    {offersLace ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-[#2D241E]/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={line.withLace}
                            onChange={(e) => updateLine(index, {
                              withLace: e.target.checked,
                              laceColorId: e.target.checked ? (line.laceColorId ?? laceComponents[0].colorId) : null,
                            })}
                          />
                          With lace — adds a separate lace line
                          {line.withLace && laceSurchargeCents > 0
                            ? ` (+${moneyFromCents(laceSurchargeCents, lineProduct!.sellingCurrencyCode)})`
                            : ""}
                        </label>
                        {line.withLace ? (
                          <select
                            className={controlClass()}
                            value={line.laceColorId ?? ""}
                            onChange={(e) => updateLine(index, { laceColorId: Number(e.target.value) })}
                            aria-label="Lace color"
                          >
                            {laceComponents.map((sc) => (
                              <option key={sc.colorId} value={sc.colorId!}>
                                {sc.colorName ?? sc.componentProductName}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Button
              tone="light"
              onClick={() => setOrderForm((c) => {
                const product = products[0];
                const displayCents = product != null
                  ? toDisplayCents(
                      product.sellingPriceCents,
                      product.sellingCurrencyCode,
                      c.currencyCode,
                      c.exchangeRate,
                    )
                  : null;
                return {
                  ...c,
                  lines: [...c.lines, {
                    productId: product?.id ?? 0,
                    quantity: "1",
                    listedPrice: displayCents != null ? inputFromCents(displayCents) : "",
                    vat: "0",
                    withLace: false,
                    laceColorId: null,
                  }],
                };
              })}
            >
              <Plus size={14} /> Add line
            </Button>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setOrderModal(false)}>Cancel</Button>
              <Button onClick={() => void saveOrder()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Create sale
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {quickCustomerOpen ? (
        <Dialog title="New customer" subtitle="For in-person or social-media sales" onClose={() => setQuickCustomerOpen(false)}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="qc-first">First name</Label>
                <input id="qc-first" className={controlClass()} value={quickCustomerForm.firstName} onChange={(e) => setQuickCustomerForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="qc-last">Last name</Label>
                <input id="qc-last" className={controlClass()} value={quickCustomerForm.lastName} onChange={(e) => setQuickCustomerForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="qc-email">Email</Label>
                <input id="qc-email" type="email" className={controlClass()} value={quickCustomerForm.email} onChange={(e) => setQuickCustomerForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="qc-phone">Phone</Label>
                <input id="qc-phone" className={controlClass()} value={quickCustomerForm.phoneNumber} onChange={(e) => setQuickCustomerForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Add an address later from the Customers tab if this order needs shipping.
            </p>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setQuickCustomerOpen(false)}>Cancel</Button>
              <Button onClick={() => void saveQuickCustomer()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Create &amp; select
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {voidOrderId != null ? (
        <Dialog title="Void sale?" subtitle={`Sale #${voidOrderId}`} onClose={() => setVoidOrderId(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#2D241E]/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              This restores finished-goods and storefront stock and cancels the sale. Use this to correct a mistaken entry, not a customer return.
            </p>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setVoidOrderId(null)}>Cancel</Button>
              <Button tone="danger" onClick={() => void confirmVoidOrder()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Void
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
