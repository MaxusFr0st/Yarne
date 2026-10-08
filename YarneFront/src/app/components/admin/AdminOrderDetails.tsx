import { useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { AdminMakingPhotos } from "./AdminMakingPhotos";
import { fetchOrderReceiptObjectUrl } from "../../api/orders";
import { PriceTag } from "../PriceTag";

const SANS = { fontFamily: "'DM Sans', sans-serif" } as const;
const PANEL = { border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(255,255,255,0.55)" } as const;
const LABEL_CLASS = "text-[10px] uppercase tracking-widest text-[#2D241E]/40";

export type AdminOrderDetailsOrder = {
  id: number;
  orderNumber: string | null;
  statusUrl: string | null;
  customerId: number | null;
  locale: string | null;
  orderDate: string;
  total: number;
  paymentChoice: "Transfer" | "Pickup" | null;
  paymentReceivedAt: string | null;
  receiptUploadedAt: string | null;
  paymentClaimedAt: string | null;
  paymentCurrency: "UAH" | "EUR";
  eurTotal: number | null;
  isForeignDelivery: boolean;
  photosRequestedAt: string | null;
  makingPhotoCount: number;
  itemCount: number;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm" style={SANS}>
      <span className="text-[#2D241E]/55">{label}</span>
      <span className="text-[#2D241E] text-right min-w-0">{children}</span>
    </div>
  );
}

/** A section that opens on its chevron and starts closed, like the order rows themselves. */
function Collapsible({ title, children, badge }: { title: string; children: ReactNode; badge?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[18px]" style={PANEL}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer"
      >
        <span className="inline-flex items-center gap-2">
          <span className={LABEL_CLASS} style={{ ...SANS, letterSpacing: "0.1em" }}>
            {title}
          </span>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ ...SANS, backgroundColor: "rgba(155,107,46,0.1)", color: "#9B6B2E" }}>
              {badge}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={16} style={{ color: "#2D241E", opacity: 0.6 }} /> : <ChevronDown size={16} style={{ color: "#2D241E", opacity: 0.6 }} />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/**
 * The expanded order row: the Order and Payment blocks stay in view; the items and the Nova Poshta
 * waybill each sit under their own chevron, closed until opened.
 */
export function AdminOrderDetails({
  order,
  busy,
  onMarkPaid,
  onUndoPaid,
  onResetChoice,
  onSetChoice,
  onPhotosChanged,
  onError,
  itemsNode,
  waybillNode,
}: {
  order: AdminOrderDetailsOrder;
  busy: boolean;
  onMarkPaid: (orderId: number) => void;
  onUndoPaid: (orderId: number) => void;
  /** Lets the customer choose how to pay again. */
  onResetChoice: (orderId: number) => void;
  onSetChoice: (orderId: number, choice: "Transfer" | "Pickup") => void;
  onPhotosChanged: (orderId: number, count: number) => void;
  onError: (message: string) => void;
  itemsNode: ReactNode;
  waybillNode: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const placed = new Date(order.orderDate);
  const choiceLabel = order.paymentChoice === "Transfer" ? "Card transfer" : order.paymentChoice === "Pickup" ? "On pickup" : "Waiting for the customer";

  const copyLink = async () => {
    if (!order.statusUrl) return;
    try {
      await navigator.clipboard.writeText(order.statusUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onError("The link could not be copied.");
    }
  };

  const viewReceipt = async () => {
    try {
      window.open(await fetchOrderReceiptObjectUrl(order.id), "_blank", "noopener");
    } catch (e) {
      onError(e instanceof Error ? e.message : "The receipt could not be loaded.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[18px] p-3 space-y-2" style={PANEL}>
          <p className={LABEL_CLASS} style={{ ...SANS, letterSpacing: "0.1em" }}>Order</p>
          <Row label="Number">{order.orderNumber ?? `#${order.id}`}</Row>
          <Row label="Placed">{`${placed.toLocaleDateString()} ${placed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</Row>
          <Row label="Customer">{order.customerId ? `Account #${order.customerId}` : "Guest"}</Row>
          <Row label="Language">{order.locale === "en" ? "English" : "Українська"}</Row>
          {order.statusUrl && (
            <button
              type="button"
              onClick={() => void copyLink()}
              className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[#2D241E] cursor-pointer"
              style={{ ...SANS, fontSize: "0.68rem", borderColor: "rgba(45,36,30,0.2)" }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy status link"}
            </button>
          )}
        </div>

        <div className="rounded-[18px] p-3 space-y-2" style={PANEL}>
          <p className={LABEL_CLASS} style={{ ...SANS, letterSpacing: "0.1em" }}>Payment</p>
          <Row label="Customer chose">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>{choiceLabel}</span>
              {!order.paymentReceivedAt && (
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                  {order.paymentChoice !== "Transfer" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onSetChoice(order.id, "Transfer")}
                      className="text-xs text-[#4A0E0E] underline underline-offset-2 disabled:opacity-50 cursor-pointer"
                    >
                      Set: Card transfer
                    </button>
                  )}
                  {!order.isForeignDelivery && order.paymentChoice !== "Pickup" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!order.paymentChoice || window.confirm("Set this order to pay on pickup? A receipt they sent will be deleted.")) onSetChoice(order.id, "Pickup");
                      }}
                      className="text-xs text-[#4A0E0E] underline underline-offset-2 disabled:opacity-50 cursor-pointer"
                    >
                      Set: On pickup
                    </button>
                  )}
                  {order.paymentChoice && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Let the customer choose how to pay again? A receipt they sent will be deleted.")) onResetChoice(order.id);
                      }}
                      className="text-xs text-[#4A0E0E] underline underline-offset-2 disabled:opacity-50 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </span>
              )}
            </span>
          </Row>
          {order.paymentChoice === "Pickup" && order.paymentCurrency !== "EUR" && <Row label="Customer pays on pickup"><PriceTag amount={order.total} locale="uk" variant="line" /></Row>}
          {order.paymentCurrency === "EUR" ? (
            <Row label="Customer pays">
              <PriceTag amount={order.total} eurAmount={order.eurTotal} currency="EUR" locale="uk" variant="line" /> (EUR, abroad)
            </Row>
          ) : (
            <Row label="Declared value"><PriceTag amount={order.total} locale="uk" variant="line" /></Row>
          )}
          {order.paymentChoice === "Transfer" && (
            <>
              <Row label="Receipt">
                {order.receiptUploadedAt ? (
                  <span className="inline-flex items-center gap-2">
                    <button type="button" onClick={() => void viewReceipt()} className="underline underline-offset-2 cursor-pointer">
                      View receipt
                    </button>
                    <span className="text-[#2D241E]/45 text-xs">{new Date(order.receiptUploadedAt).toLocaleString()}</span>
                  </span>
                ) : (
                  <span className="text-[#2D241E]/45">Not uploaded</span>
                )}
              </Row>
              {order.paymentClaimedAt && !order.paymentReceivedAt && (
                <Row label="Customer says paid">{new Date(order.paymentClaimedAt).toLocaleString()}</Row>
              )}
              {order.paymentReceivedAt ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#2D241E]" style={SANS}>
                    <Check size={14} /> Paid · {new Date(order.paymentReceivedAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onUndoPaid(order.id)}
                    className="px-2.5 py-1 rounded-full border text-[#4A0E0E] disabled:opacity-50 cursor-pointer"
                    style={{ ...SANS, fontSize: "0.68rem", borderColor: "rgba(74,14,14,0.25)" }}
                  >
                    Undo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onMarkPaid(order.id)}
                  className="mt-1 px-3 py-1.5 rounded-full text-[#F5F2ED] disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: "#2D241E", ...SANS, fontSize: "0.7rem", letterSpacing: "0.06em" }}
                >
                  Payment received
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {order.itemCount > 0 && <Collapsible title={`Items (${order.itemCount})`}>{itemsNode}</Collapsible>}
      <Collapsible title="Making-of photos" badge={order.photosRequestedAt && order.makingPhotoCount === 0 ? "Requested" : undefined}>
        <AdminMakingPhotos orderId={order.id} onChanged={(count) => onPhotosChanged(order.id, count)} onError={onError} />
      </Collapsible>
      <Collapsible title="Nova Poshta">{waybillNode}</Collapsible>
    </div>
  );
}
