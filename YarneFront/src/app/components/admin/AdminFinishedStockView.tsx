import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import {
  fetchFinishedGoodsStock,
  type FinishedGoodsStockProductDto,
} from "../../api/accounting";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Panel,
  formatLocalDate,
  moneyFromCents,
} from "./accountingAdminUi";

function variantLabel(lot: {
  colorName: string | null;
  sizeName: string | null;
  lace: boolean;
}): string {
  if (!lot.colorName && !lot.sizeName) return "—";
  return [lot.colorName, lot.sizeName, lot.lace ? "lace" : null].filter(Boolean).join(", ");
}

function marginTone(marginPct: number | null): string {
  if (marginPct == null) return "rgba(45,36,30,0.45)";
  if (marginPct < 0) return "#B42318";
  if (marginPct < 30) return "#B54708";
  return "#227850";
}

/**
 * Finished-goods stock per product: every active FinishedGoodsLot with its production
 * date, remaining quantity, precise unit cost, optional variant tag, and the margin the
 * current selling price yields over that lot's cost.
 */
export function AdminFinishedStockView() {
  const [rows, setRows] = useState<FinishedGoodsStockProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchFinishedGoodsStock());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load finished stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Produced stock by batch — each lot keeps the exact cost of the materials that went
          into it, and margin is against the current selling price.
        </p>
        <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh finished stock">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading stock…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No finished stock"
            detail="Complete a production run to build finished goods lots."
          />
        ) : (
          <div className="divide-y divide-[#2D241E]/08">
            {rows.map((product) => {
              const open = expanded === product.productId;
              return (
                <div key={product.productId} className="px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                    onClick={() => setExpanded(open ? null : product.productId)}
                    aria-expanded={open}
                    aria-label={`Toggle lots for ${product.productName}`}
                  >
                    <div>
                      <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {product.productName}
                      </p>
                      <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {product.productSku} · {product.lots.length} lot{product.lots.length === 1 ? "" : "s"}
                        {product.sellingPriceCents > 0
                          ? ` · sells at ${moneyFromCents(product.sellingPriceCents)}`
                          : " · no selling price set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-sm text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {product.totalQuantityRemaining} in stock
                      </span>
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {open ? (
                    <div className="mt-4 overflow-x-auto rounded-2xl bg-white/60 p-4" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                      <table className="w-full min-w-[560px] text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <thead>
                          <tr className="text-left text-[0.66rem] uppercase tracking-[0.12em] text-[#2D241E]/45">
                            <th className="pb-2 pr-3 font-normal">Produced</th>
                            <th className="pb-2 pr-3 font-normal">Variant</th>
                            <th className="pb-2 pr-3 text-right font-normal">Remaining</th>
                            <th className="pb-2 pr-3 text-right font-normal">Unit cost</th>
                            <th className="pb-2 text-right font-normal">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.lots.map((lot) => (
                            <tr key={lot.lotId} className="border-t border-[#2D241E]/08">
                              <td className="py-2.5 pr-3 text-[#2D241E]/75">
                                {formatLocalDate(lot.productionDate)}
                                <span className="text-[#2D241E]/40"> · run #{lot.productionOrderId}</span>
                              </td>
                              <td className="py-2.5 pr-3 text-[#2D241E]/75">{variantLabel(lot)}</td>
                              <td className="py-2.5 pr-3 text-right tabular-nums text-[#2D241E]">
                                {lot.quantityRemaining}
                                <span className="text-[#2D241E]/40"> / {lot.quantityProduced}</span>
                              </td>
                              <td className="py-2.5 pr-3 text-right tabular-nums text-[#2D241E]">
                                {moneyFromCents(lot.unitCostCents)}
                              </td>
                              <td className="py-2.5 text-right tabular-nums" style={{ color: marginTone(lot.marginPct) }}>
                                {lot.marginPct == null ? "—" : `${lot.marginPct.toFixed(1)}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
