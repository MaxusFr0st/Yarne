import React, { useCallback, useEffect, useState } from "react";
import {
  Ban, Camera, CloudOff, Loader2, Pencil, Plus, RefreshCw, Upload, Wifi,
} from "lucide-react";
import {
  createOperatingExpense,
  createOperatingExpenseCategory,
  fetchOperatingExpenseCategories,
  fetchOperatingExpenses,
  updateOperatingExpense,
  updateOperatingExpenseCategory,
  uploadAccountingReceipt,
  voidOperatingExpense,
  voidOperatingExpenseCategory,
  type OperatingExpenseCategoryDto,
  type OperatingExpenseDto,
  type SaveOperatingExpenseRequest,
} from "../../api/accounting";
import {
  getQueuedExpenses,
  queueExpense,
  syncQueuedExpenses,
  type PendingExpense,
} from "../../offline/expenseQueue";
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

async function submitOperatingExpensePayload(
  body: SaveOperatingExpenseRequest,
): Promise<OperatingExpenseDto> {
  return createOperatingExpense(body);
}

export async function submitPendingExpense(expense: PendingExpense): Promise<void> {
  let receiptUrl: string | undefined;
  if (expense.receiptBlob) {
    const file = new File(
      [expense.receiptBlob],
      expense.receiptFileName || "receipt.jpg",
      { type: expense.receiptBlob.type || "image/jpeg" },
    );
    receiptUrl = await uploadAccountingReceipt(file);
  }
  const currency = (expense.currencyCode || "UAH").trim().toUpperCase();
  const parsedRate = Number(expense.exchangeRateToBase);
  // Never force 1:1 for foreign currency — let the server resolve the rate when omitted.
  const exchangeRateToBase =
    currency === "UAH" ? null : Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;
  await submitOperatingExpensePayload({
    categoryId: expense.categoryId,
    date: toApiDate(expense.date),
    amountCents: expense.amountCents,
    vatAmountCents: expense.vatAmountCents,
    currencyCode: currency,
    exchangeRateToBase,
    vendor: expense.vendor ?? null,
    description: expense.description ?? null,
    paymentMethod: expense.paymentMethod ?? null,
    receiptUrl: receiptUrl ?? null,
  });
}

export function AdminOperatingExpensesView({ mode }: { mode: "list" | "quick" }) {
  const [categories, setCategories] = useState<OperatingExpenseCategoryDto[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpenseDto[]>([]);
  const [queued, setQueued] = useState<PendingExpense[]>([]);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const [catModal, setCatModal] = useState<OperatingExpenseCategoryDto | "new" | null>(null);
  const [catName, setCatName] = useState("");
  const [voidCatId, setVoidCatId] = useState<number | null>(null);

  const [expModal, setExpModal] = useState<OperatingExpenseDto | "new" | null>(null);
  const [voidExpId, setVoidExpId] = useState<number | null>(null);
  const [expForm, setExpForm] = useState({
    categoryId: 0,
    date: localIsoDate(),
    amount: "",
    vat: "0",
    currencyCode: "UAH",
    exchangeRate: "1",
    vendor: "",
    description: "",
    paymentMethod: "",
    receiptUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  // Quick capture
  const [quick, setQuick] = useState({
    categoryId: 0,
    amount: "",
    receiptFile: null as File | null,
  });

  const refreshQueue = useCallback(async () => {
    setQueued(await getQueuedExpenses());
  }, []);

  const syncQueue = useCallback(async () => {
    const result = await syncQueuedExpenses(submitPendingExpense);
    await refreshQueue();
    if (result.synced > 0) {
      setSyncNote(`Synced ${result.synced} queued expense${result.synced === 1 ? "" : "s"}.`);
      if (mode === "list") {
        setExpenses(await fetchOperatingExpenses());
      }
    }
    return result;
  }, [mode, refreshQueue]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCats, nextExpenses] = await Promise.all([
        fetchOperatingExpenseCategories(),
        mode === "list" ? fetchOperatingExpenses() : Promise.resolve([] as OperatingExpenseDto[]),
      ]);
      setCategories(nextCats);
      if (mode === "list") setExpenses(nextExpenses);
      await refreshQueue();
      if (navigator.onLine) await syncQueue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load operating expenses.");
    } finally {
      setLoading(false);
    }
  }, [mode, refreshQueue, syncQueue]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncQueue();
    };
    const onOffline = () => setOnline(false);
    const onQueue = () => { void refreshQueue(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("yarne-expense-queue-changed", onQueue);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("yarne-expense-queue-changed", onQueue);
    };
  }, [refreshQueue, syncQueue]);

  useEffect(() => {
    if (categories.length && !quick.categoryId) {
      setQuick((c) => ({ ...c, categoryId: categories[0].id }));
    }
  }, [categories, quick.categoryId]);

  const openCat = (cat: OperatingExpenseCategoryDto | "new") => {
    setCatName(cat === "new" ? "" : cat.name);
    setCatModal(cat);
  };

  const saveCat = async () => {
    if (!catName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (catModal === "new") await createOperatingExpenseCategory({ name: catName.trim() });
      else if (catModal) await updateOperatingExpenseCategory(catModal.id, { name: catName.trim() });
      setCatModal(null);
      setCategories(await fetchOperatingExpenseCategories());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save category.");
    } finally {
      setSaving(false);
    }
  };

  const openExpense = (expense: OperatingExpenseDto | "new") => {
    if (expense === "new") {
      setExpForm({
        categoryId: categories[0]?.id ?? 0,
        date: localIsoDate(),
        amount: "",
        vat: "0",
        currencyCode: "UAH",
        exchangeRate: "",
        vendor: "",
        description: "",
        paymentMethod: "",
        receiptUrl: "",
      });
    } else {
      setExpForm({
        categoryId: expense.categoryId,
        date: dateOnly(expense.date),
        amount: inputFromCents(expense.amountCents),
        vat: inputFromCents(expense.vatAmountCents),
        currencyCode: expense.currencyCode,
        exchangeRate: String(expense.exchangeRateToBase),
        vendor: expense.vendor ?? "",
        description: expense.description ?? "",
        paymentMethod: expense.paymentMethod ?? "",
        receiptUrl: expense.receiptUrl ?? "",
      });
    }
    setExpModal(expense);
  };

  const uploadReceipt = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the receipt.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAccountingReceipt(file);
      setExpForm((c) => ({ ...c, receiptUrl: url }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Receipt upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveExpense = async () => {
    if (!expForm.categoryId || centsFromInput(expForm.amount) <= 0) {
      setError("Category and amount are required.");
      return;
    }
    const currency = expForm.currencyCode.trim().toUpperCase() || "UAH";
    const parsedRate = Number(expForm.exchangeRate);
    const exchangeRateToBase =
      currency === "UAH" ? null : Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;
    const body: SaveOperatingExpenseRequest = {
      categoryId: expForm.categoryId,
      date: toApiDate(expForm.date),
      amountCents: centsFromInput(expForm.amount),
      vatAmountCents: centsFromInput(expForm.vat),
      currencyCode: currency,
      exchangeRateToBase,
      vendor: expForm.vendor.trim() || null,
      description: expForm.description.trim() || null,
      paymentMethod: expForm.paymentMethod.trim() || null,
      receiptUrl: expForm.receiptUrl || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (!navigator.onLine && expModal === "new") {
        await queueExpense({
          categoryId: body.categoryId,
          date: expForm.date,
          amountCents: body.amountCents,
          vatAmountCents: body.vatAmountCents,
          currencyCode: body.currencyCode,
          exchangeRateToBase: exchangeRateToBase ?? undefined,
          vendor: body.vendor ?? undefined,
          description: body.description ?? undefined,
          paymentMethod: body.paymentMethod ?? undefined,
        });
        setExpModal(null);
        setSyncNote("Saved offline — will sync when you are back online.");
        await refreshQueue();
        return;
      }
      if (expModal === "new") await createOperatingExpense(body);
      else if (expModal) await updateOperatingExpense(expModal.id, body);
      setExpModal(null);
      setExpenses(await fetchOperatingExpenses());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save expense.");
    } finally {
      setSaving(false);
    }
  };

  const submitQuick = async () => {
    if (!quick.categoryId || centsFromInput(quick.amount) <= 0) {
      setError("Tap a category and enter an amount.");
      return;
    }
    setSaving(true);
    setError(null);
    setSyncNote(null);
    try {
      if (!navigator.onLine) {
        await queueExpense({
          categoryId: quick.categoryId,
          date: localIsoDate(),
          amountCents: centsFromInput(quick.amount),
          vatAmountCents: 0,
          currencyCode: "UAH",
          exchangeRateToBase: 1,
          receiptBlob: quick.receiptFile ?? undefined,
          receiptFileName: quick.receiptFile?.name,
        });
        setQuick((c) => ({ ...c, amount: "", receiptFile: null }));
        setSyncNote("Queued offline. Will upload when online.");
        await refreshQueue();
        return;
      }
      let receiptUrl: string | null = null;
      if (quick.receiptFile) {
        receiptUrl = await uploadAccountingReceipt(quick.receiptFile);
      }
      await createOperatingExpense({
        categoryId: quick.categoryId,
        date: toApiDate(localIsoDate()),
        amountCents: centsFromInput(quick.amount),
        vatAmountCents: 0,
        currencyCode: "UAH",
        exchangeRateToBase: 1,
        receiptUrl,
      });
      setQuick((c) => ({ ...c, amount: "", receiptFile: null }));
      setSyncNote("Expense saved.");
      await refreshQueue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit expense.");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "quick") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Quick capture · {formatLocalDate(localIsoDate())}
            </p>
            <h3 className="text-2xl text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Log expense
            </h3>
          </div>
          <StatusPill tone={online ? "ok" : "warn"}>
            {online ? <><Wifi size={12} className="inline" /> Online</> : <><CloudOff size={12} className="inline" /> Offline</>}
          </StatusPill>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
        {syncNote ? (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm text-[#315B42]" style={{ backgroundColor: "rgba(49,91,66,0.1)", fontFamily: "'DM Sans', sans-serif" }}>
            {syncNote}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <Panel className="p-4 sm:p-5">
            <p className="mb-3 text-[0.68rem] font-medium uppercase tracking-[0.13em] text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Category
            </p>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const active = quick.categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setQuick((c) => ({ ...c, categoryId: cat.id }))}
                    className={`min-h-12 cursor-pointer rounded-2xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E] motion-reduce:transition-none ${
                      active ? "bg-[#2D241E] text-[#F5F2ED]" : "bg-white/70 text-[#2D241E] hover:bg-white"
                    }`}
                    style={{ border: "1px solid rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
                    aria-pressed={active}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {!categories.length ? (
              <p className="mb-4 text-sm text-[#641D1D]">Add an operating expense category first.</p>
            ) : null}

            <Label htmlFor="quick-amount">Amount</Label>
            <input
              id="quick-amount"
              inputMode="decimal"
              className={`${controlClass("mb-4 text-2xl tabular-nums")} text-center`}
              placeholder="0.00"
              value={quick.amount}
              onChange={(e) => setQuick((c) => ({ ...c, amount: e.target.value }))}
              aria-label="Expense amount"
            />

            <Label htmlFor="quick-receipt">Receipt photo</Label>
            <label
              htmlFor="quick-receipt"
              className="mb-5 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2D241E]/25 bg-white/50 px-4 py-6 text-sm text-[#2D241E]/65 focus-within:ring-2 focus-within:ring-[#75482E]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Camera size={22} strokeWidth={1.5} />
              {quick.receiptFile ? quick.receiptFile.name : "Tap to snap or choose receipt"}
              <input
                id="quick-receipt"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => setQuick((c) => ({ ...c, receiptFile: e.target.files?.[0] ?? null }))}
              />
            </label>

            <Button className="w-full" onClick={() => void submitQuick()} disabled={saving || !categories.length}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {online ? "Submit expense" : "Queue offline"}
            </Button>

            {queued.length > 0 ? (
              <p className="mt-4 text-center text-xs text-[#2D241E]/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {queued.length} pending offline
              </p>
            ) : null}
          </Panel>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Operating expenses with categories and optional receipt uploads.
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {online ? <Wifi size={12} /> : <CloudOff size={12} />}
            {online ? "Online" : "Offline"}
            {queued.length ? ` · ${queued.length} queued` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh expenses">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
          <Button tone="light" onClick={() => openCat("new")}><Plus size={14} /> Category</Button>
          <Button onClick={() => openExpense("new")} disabled={!categories.length}>
            <Plus size={14} /> Expense
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {syncNote ? (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm text-[#315B42]" style={{ backgroundColor: "rgba(49,91,66,0.1)", fontFamily: "'DM Sans', sans-serif" }}>
          {syncNote}
        </div>
      ) : null}

      <div className="mb-6">
        <p className="mb-2 text-[0.68rem] uppercase tracking-[0.12em] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="inline-flex items-center gap-1 rounded-full bg-white/60 pl-3 pr-1"
              style={{ border: "1px solid rgba(45,36,30,0.12)" }}
            >
              <span className="text-sm text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{cat.name}</span>
              <button type="button" className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit ${cat.name}`} onClick={() => openCat(cat)}>
                <Pencil size={13} />
              </button>
              <button type="button" className="flex size-9 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Void ${cat.name}`} onClick={() => setVoidCatId(cat.id)}>
                <Ban size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading expenses…
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState title="No operating expenses" detail="Add categories, then log expenses with optional receipts." />
        ) : (
          <div className="divide-y divide-[#2D241E]/08">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {expense.categoryName}
                    {expense.vendor ? ` · ${expense.vendor}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {formatLocalDate(expense.date)}
                    {expense.description ? ` · ${expense.description}` : ""}
                    {expense.receiptUrl ? " · receipt" : ""}
                  </p>
                  <p className="mt-2 text-sm tabular-nums text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {moneyFromCents(expense.amountCents, expense.currencyCode)}
                    {expense.vatAmountCents ? ` · VAT ${moneyFromCents(expense.vatAmountCents, expense.currencyCode)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusPill>{expense.status}</StatusPill>
                  <button type="button" className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Edit expense ${expense.id}`} onClick={() => openExpense(expense)}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label={`Void expense ${expense.id}`} onClick={() => setVoidExpId(expense.id)}>
                    <Ban size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {queued.length > 0 ? (
        <Panel className="mt-4">
          <div className="px-5 py-4">
            <p className="mb-2 text-sm font-medium text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Offline queue ({queued.length})
            </p>
            {queued.map((item) => (
              <p key={item.id} className="text-xs text-[#2D241E]/55 tabular-nums" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {formatLocalDate(item.date)} · {moneyFromCents(item.amountCents, item.currencyCode)}
                {item.receiptBlob ? " · receipt pending upload" : ""}
              </p>
            ))}
          </div>
        </Panel>
      ) : null}

      {catModal ? (
        <Dialog title={catModal === "new" ? "New category" : "Edit category"} onClose={() => setCatModal(null)}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="oec-name">Name</Label>
              <input id="oec-name" className={controlClass()} value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setCatModal(null)}>Cancel</Button>
              <Button onClick={() => void saveCat()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {expModal ? (
        <Dialog title={expModal === "new" ? "New expense" : "Edit expense"} onClose={() => setExpModal(null)} wide>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="oe-cat">Category</Label>
                <select id="oe-cat" className={controlClass()} value={expForm.categoryId || ""} onChange={(e) => setExpForm((c) => ({ ...c, categoryId: Number(e.target.value) }))}>
                  <option value="">Select</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="oe-date">Date</Label>
                <input id="oe-date" type="date" className={controlClass()} value={dateOnly(expForm.date)} onChange={(e) => setExpForm((c) => ({ ...c, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="oe-amount">Amount</Label>
                <input id="oe-amount" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={expForm.amount} onChange={(e) => setExpForm((c) => ({ ...c, amount: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="oe-vat">VAT</Label>
                <input id="oe-vat" inputMode="decimal" className={`${controlClass()} tabular-nums`} value={expForm.vat} onChange={(e) => setExpForm((c) => ({ ...c, vat: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="oe-currency">Currency</Label>
                <input id="oe-currency" className={controlClass()} value={expForm.currencyCode} onChange={(e) => setExpForm((c) => ({ ...c, currencyCode: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="oe-vendor">Vendor</Label>
                <input id="oe-vendor" className={controlClass()} value={expForm.vendor} onChange={(e) => setExpForm((c) => ({ ...c, vendor: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="oe-pay">Payment method</Label>
                <input id="oe-pay" className={controlClass()} value={expForm.paymentMethod} onChange={(e) => setExpForm((c) => ({ ...c, paymentMethod: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="oe-desc">Description</Label>
              <textarea id="oe-desc" rows={2} className={controlClass()} value={expForm.description} onChange={(e) => setExpForm((c) => ({ ...c, description: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="oe-receipt">Receipt</Label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#2D241E]/15 bg-white/50 px-4 text-xs uppercase tracking-[0.1em] text-[#2D241E] hover:bg-white/80">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload
                  <input id="oe-receipt" type="file" accept="image/*" className="sr-only" onChange={(e) => void uploadReceipt(e.target.files?.[0])} />
                </label>
                {expForm.receiptUrl ? (
                  <a href={expForm.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-[#75482E] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]">
                    View receipt
                  </a>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setExpModal(null)}>Cancel</Button>
              <Button onClick={() => void saveExpense()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {voidCatId != null ? (
        <Dialog title="Void category?" onClose={() => setVoidCatId(null)}>
          <div className="flex justify-end gap-2">
            <Button tone="light" onClick={() => setVoidCatId(null)}>Cancel</Button>
            <Button tone="danger" disabled={saving} onClick={() => {
              void (async () => {
                setSaving(true);
                try {
                  await voidOperatingExpenseCategory(voidCatId);
                  setVoidCatId(null);
                  setCategories(await fetchOperatingExpenseCategories());
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : "Could not void category.");
                } finally {
                  setSaving(false);
                }
              })();
            }}>
              Void
            </Button>
          </div>
        </Dialog>
      ) : null}

      {voidExpId != null ? (
        <Dialog title="Void expense?" onClose={() => setVoidExpId(null)}>
          <div className="flex justify-end gap-2">
            <Button tone="light" onClick={() => setVoidExpId(null)}>Cancel</Button>
            <Button tone="danger" disabled={saving} onClick={() => {
              void (async () => {
                setSaving(true);
                try {
                  await voidOperatingExpense(voidExpId);
                  setVoidExpId(null);
                  setExpenses(await fetchOperatingExpenses());
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : "Could not void expense.");
                } finally {
                  setSaving(false);
                }
              })();
            }}>
              Void
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
