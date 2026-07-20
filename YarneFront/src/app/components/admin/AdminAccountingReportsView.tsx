import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  fetchAccountingDashboardV3,
  type AccountingDashboardV3Dto,
  type AccountingProductDto,
} from "../../api/accounting";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Label,
  Panel,
  SectionTitle,
  StatusPill,
  controlClass,
  localIsoDate,
  moneyFromCents,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "./accountingAdminUi";

type Preset = "week" | "month" | "quarter" | "year" | "custom";

function MoneyRow({ label, cents, currency, emphasize }: { label: string; cents: number; currency: string; emphasize?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${emphasize ? "border-t border-[#2D241E]/10 pt-2.5" : ""}`}>
      <span className="text-sm text-[#2D241E]/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      <span className={`tabular-nums text-[#2D241E] ${emphasize ? "text-base font-medium" : "text-sm"}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {moneyFromCents(cents, currency)}
      </span>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}) {
  if (!rows.length) {
    return <p className="px-1 py-3 text-sm text-[#2D241E]/45">No data in this period.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <thead>
          <tr className="border-b border-[#2D241E]/10 text-[0.68rem] uppercase tracking-[0.1em] text-[#2D241E]/45">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#2D241E]/06 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2.5 text-[#2D241E] tabular-nums">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarginFlagRow({ product, currency }: { product: AccountingProductDto; currency: string }) {
  const pct = product.margin.currentMarginPct;
  const flagged = product.margin.isFlagged;
  return (
    <div className={`rounded-xl px-3 py-2.5 ${flagged ? "bg-[#641D1D]/8" : "bg-white/40"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{product.name}</span>
        <StatusPill tone={flagged ? "danger" : pct == null ? "neutral" : "ok"}>
          {pct == null ? "No cost" : `${pct.toFixed(1)}%`}
        </StatusPill>
      </div>
      {flagged && pct != null ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[#641D1D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Current margin {pct.toFixed(1)}% is below your threshold of {product.margin.thresholdPct}%.
          BOM cost is {moneyFromCents(product.margin.currentBomCostCents ?? 0, currency)}, selling at {moneyFromCents(product.margin.sellingPriceBaseCents ?? product.sellingPriceCents, currency)}.
        </p>
      ) : null}
    </div>
  );
}

export function AdminAccountingReportsView() {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(startOfMonth);
  const [to, setTo] = useState(localIsoDate);
  const [data, setData] = useState<AccountingDashboardV3Dto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (next: Preset) => {
    setPreset(next);
    const today = localIsoDate();
    setTo(today);
    if (next === "week") setFrom(startOfWeek());
    else if (next === "month") setFrom(startOfMonth());
    else if (next === "quarter") setFrom(startOfQuarter());
    else if (next === "year") setFrom(startOfYear());
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAccountingDashboardV3(from, to));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load ledger report.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = data?.baseCurrencyCode ?? "UAH";
  const pl = data?.profitAndLoss;
  const vat = data?.vat;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Ledger dashboard — P&L, VAT, stock, margins, COGS, returns, and sales breakdowns.
          </p>
        </div>
        <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh ledger">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["week", "month", "quarter", "year", "custom"] as Preset[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={`min-h-10 cursor-pointer rounded-full px-4 text-xs uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E] motion-reduce:transition-none ${
              preset === key ? "bg-[#2D241E] text-[#F5F2ED]" : "bg-[#2D241E]/5 text-[#2D241E]/60 hover:bg-[#2D241E]/8"
            }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            aria-pressed={preset === key}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="mb-6 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rep-from">From</Label>
          <input
            id="rep-from"
            type="date"
            className={controlClass()}
            value={from}
            onChange={(e) => {
              setPreset("custom");
              setFrom(e.target.value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="rep-to">To</Label>
          <input
            id="rep-to"
            type="date"
            className={controlClass()}
            value={to}
            onChange={(e) => {
              setPreset("custom");
              setTo(e.target.value);
            }}
          />
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#2D241E]/55">
          <Loader2 size={16} className="animate-spin" /> Loading ledger…
        </div>
      ) : !data ? (
        <EmptyState title="No report" detail="Choose a date range and refresh." />
      ) : (
        <div className="space-y-8">
          <section>
            <SectionTitle>Profit &amp; loss</SectionTitle>
            <Panel className="p-5">
              {pl ? (
                <>
                  <MoneyRow label="Listed revenue" cents={pl.listedRevenueCents} currency={currency} />
                  <MoneyRow label="Refunds" cents={pl.refundsCents} currency={currency} />
                  <MoneyRow label="Revenue" cents={pl.revenueCents} currency={currency} />
                  <MoneyRow label="Channel fees" cents={pl.channelFeesCents} currency={currency} />
                  <MoneyRow label="Net revenue" cents={pl.netRevenueCents} currency={currency} />
                  <MoneyRow label="COGS" cents={pl.cogsCents} currency={currency} />
                  <MoneyRow label="Gross profit" cents={pl.grossProfitCents} currency={currency} />
                  <MoneyRow label="Scrap loss" cents={pl.scrapCostCents} currency={currency} />
                  <MoneyRow label="Operating expenses" cents={pl.operatingExpensesCents} currency={currency} />
                  <MoneyRow label="Net profit" cents={pl.netProfitCents} currency={currency} emphasize />
                </>
              ) : null}
            </Panel>
          </section>

          <section>
            <SectionTitle>VAT summary</SectionTitle>
            <Panel className="p-5">
              {vat ? (
                <>
                  <MoneyRow label="Output VAT collected" cents={vat.outputVatCollectedCents} currency={currency} />
                  <MoneyRow label="Output VAT reversed" cents={vat.outputVatReversedCents} currency={currency} />
                  <MoneyRow label="Net output VAT" cents={vat.netOutputVatCents} currency={currency} />
                  <MoneyRow label="Purchase input VAT" cents={vat.purchaseInputVatCents} currency={currency} />
                  <MoneyRow label="Expense input VAT" cents={vat.expenseInputVatCents} currency={currency} />
                  <MoneyRow label="Total input VAT" cents={vat.totalInputVatCents} currency={currency} />
                  <MoneyRow label="VAT payable" cents={vat.vatPayableCents} currency={currency} emphasize />
                </>
              ) : null}
            </Panel>
          </section>

          <section>
            <SectionTitle>Inventory valuation</SectionTitle>
            <Panel className="p-5">
              <MoneyRow label="Raw materials" cents={data.inventoryValuation.rawMaterialValueCents} currency={currency} />
              <MoneyRow label="Finished goods (at cost)" cents={data.inventoryValuation.finishedGoodsValueCents} currency={currency} />
              <MoneyRow label="Total (at cost)" cents={data.inventoryValuation.totalValueCents} currency={currency} emphasize />
              <MoneyRow
                label="Finished goods if sold at listed price"
                cents={data.inventoryValuation.finishedGoodsPotentialRevenueCents}
                currency={currency}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Returns</SectionTitle>
            <Panel className="p-5">
              <div className="grid gap-3 sm:grid-cols-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <p className="text-sm text-[#2D241E]/65">Completed <span className="tabular-nums text-[#2D241E]">{data.returns.completedReturns}</span></p>
                <p className="text-sm text-[#2D241E]/65">Units <span className="tabular-nums text-[#2D241E]">{data.returns.unitsReturned}</span></p>
                <p className="text-sm text-[#2D241E]/65">Rate <span className="tabular-nums text-[#2D241E]">{data.returns.returnRatePct.toFixed(1)}%</span></p>
                <p className="text-sm text-[#2D241E]/65">Restocked <span className="tabular-nums text-[#2D241E]">{data.returns.restockedUnits}</span></p>
                <p className="text-sm text-[#2D241E]/65">Written off <span className="tabular-nums text-[#2D241E]">{data.returns.writtenOffUnits}</span></p>
                <p className="text-sm text-[#2D241E]/65">Refunds <span className="tabular-nums text-[#2D241E]">{moneyFromCents(data.returns.refundTotalCents, currency)}</span></p>
              </div>
            </Panel>
          </section>

          <section>
            <SectionTitle>Product margins</SectionTitle>
            <Panel className="space-y-2 p-4">
              {data.productMargins.length === 0 ? (
                <p className="text-sm text-[#2D241E]/45">No products.</p>
              ) : (
                data.productMargins.map((product) => (
                  <MarginFlagRow key={product.id} product={product} currency={currency} />
                ))
              )}
            </Panel>
          </section>

          <section>
            <SectionTitle>Finished goods stock</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Product", "SKU", "On hand", "Avg cost", "Value"]}
                rows={data.finishedGoods.map((row) => [
                  row.productName,
                  row.sku,
                  row.quantityOnHand,
                  moneyFromCents(row.averageUnitCostCents, currency),
                  moneyFromCents(row.valueCents, currency),
                ])}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Raw material lots</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Material", "Supplier", "Remaining", "Unit cost", "Value"]}
                rows={data.rawMaterialLots.map((row) => [
                  row.materialName,
                  row.supplierName,
                  `${row.quantityRemaining} ${row.unit}`,
                  moneyFromCents(row.baseUnitPriceCents, currency),
                  moneyFromCents(row.valueCents, currency),
                ])}
              />
            </Panel>
          </section>

          {data.lowStockAlerts.length > 0 ? (
            <section>
              <SectionTitle>Low stock alerts</SectionTitle>
              <Panel className="space-y-2 p-4">
                {data.lowStockAlerts.map((alert) => (
                  <p key={alert.materialId} className="text-sm text-[#641D1D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {alert.materialName}: {alert.quantityOnHand} {alert.unit} on hand (reorder at {alert.reorderThreshold})
                  </p>
                ))}
              </Panel>
            </section>
          ) : null}

          <section>
            <SectionTitle>COGS by product</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Product", "Qty sold", "COGS"]}
                rows={data.cogsByProduct.map((row) => [
                  row.productName,
                  row.quantitySold,
                  moneyFromCents(row.cogsCents, currency),
                ])}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Sales by channel</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Channel", "Orders", "Listed", "Fees", "Net", "Margin"]}
                rows={data.salesByChannel.map((row) => [
                  row.channelName,
                  row.orderCount,
                  moneyFromCents(row.listedRevenueCents, currency),
                  moneyFromCents(row.channelFeesCents, currency),
                  moneyFromCents(row.netRevenueCents, currency),
                  moneyFromCents(row.marginCents, currency),
                ])}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Sales by customer</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Customer", "Orders", "Listed", "Net"]}
                rows={data.salesByCustomer.map((row) => [
                  row.customerName,
                  row.orderCount,
                  moneyFromCents(row.listedRevenueCents, currency),
                  moneyFromCents(row.netRevenueCents, currency),
                ])}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Sales by product</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Product", "Qty", "Listed", "Net", "Margin"]}
                rows={data.salesByProduct.map((row) => [
                  row.productName,
                  row.quantitySold,
                  moneyFromCents(row.listedRevenueCents, currency),
                  moneyFromCents(row.netRevenueCents, currency),
                  moneyFromCents(row.marginCents, currency),
                ])}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Expenses by category</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Category", "Count", "Amount", "VAT"]}
                rows={data.expensesByCategory.map((row) => [
                  row.categoryName,
                  row.expenseCount,
                  moneyFromCents(row.amountCents, currency),
                  moneyFromCents(row.vatAmountCents, currency),
                ])}
              />
            </Panel>
          </section>

          <section>
            <SectionTitle>Material usage</SectionTitle>
            <Panel className="p-4">
              <SimpleTable
                headers={["Material", "Used", "Cost"]}
                rows={data.materialUsage.map((row) => [
                  row.materialName,
                  `${row.quantityUsed} ${row.unit}`,
                  moneyFromCents(row.costCents, currency),
                ])}
              />
            </Panel>
          </section>
        </div>
      )}
    </div>
  );
}
