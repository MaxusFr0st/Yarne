import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import {
  createAccountingCustomer,
  fetchAccountingCustomers,
  updateAccountingCustomer,
  voidAccountingCustomer,
  type AccountingCustomerDto,
} from "../../api/accounting";
import { fetchCountries, type CountryDto } from "../../api/admin";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorBanner,
  Label,
  Panel,
  controlClass,
} from "./accountingAdminUi";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postalCode: "",
  countryId: 0,
};

export function AdminCustomersView() {
  const [customers, setCustomers] = useState<AccountingCustomerDto[]>([]);
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<AccountingCustomerDto | "new" | null>(null);
  const [voidTarget, setVoidTarget] = useState<AccountingCustomerDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCustomers, nextCountries] = await Promise.all([
        fetchAccountingCustomers(),
        fetchCountries(),
      ]);
      setCustomers(nextCustomers);
      setCountries(nextCountries);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.email} ${customer.phoneNumber ?? ""}`.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const openModal = (target: AccountingCustomerDto | "new") => {
    setForm(
      target === "new"
        ? emptyForm
        : {
            firstName: target.firstName,
            lastName: target.lastName,
            email: target.email,
            phoneNumber: target.phoneNumber ?? "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            postalCode: "",
            countryId: 0,
          },
    );
    setModal(target);
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        city: form.city.trim() || null,
        postalCode: form.postalCode.trim() || null,
        countryId: form.countryId || null,
      };
      if (modal === "new") await createAccountingCustomer(body);
      else if (modal) await updateAccountingCustomer(modal.id, body);
      setModal(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save customer.");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setSaving(true);
    setError(null);
    try {
      await voidAccountingCustomer(voidTarget.id);
      setVoidTarget(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Storefront signups appear here automatically — add a contact here for in-person or social-media sales.
        </p>
        <div className="flex gap-2">
          <Button tone="light" onClick={() => void load()} disabled={loading} aria-label="Refresh customers">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
          <Button onClick={() => openModal("new")}>
            <Plus size={14} /> New customer
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <input
        className={controlClass("mb-4")}
        placeholder="Search name, email, or phone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search customers"
      />

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#2D241E]/55">
            <Loader2 size={16} className="animate-spin" /> Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No customers" detail="Add a customer to log an in-person or offline sale." />
        ) : (
          <div className="divide-y divide-[#2D241E]/08">
            {filtered.map((customer) => (
              <div key={customer.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {customer.name}
                  </p>
                  <p className="mt-1 text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {customer.email}
                    {customer.phoneNumber ? ` · ${customer.phoneNumber}` : ""}
                    {customer.address ? ` · ${customer.address}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                    aria-label={`Edit ${customer.name}`}
                    onClick={() => openModal(customer)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full text-[#641D1D] hover:bg-[#641D1D]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]"
                    aria-label={`Remove ${customer.name}`}
                    onClick={() => setVoidTarget(customer)}
                  >
                    <Ban size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {modal ? (
        <Dialog title={modal === "new" ? "New customer" : "Edit customer"} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cust-first">First name</Label>
                <input id="cust-first" className={controlClass()} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="cust-last">Last name</Label>
                <input id="cust-last" className={controlClass()} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cust-email">Email</Label>
                <input id="cust-email" type="email" className={controlClass()} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="cust-phone">Phone</Label>
                <input id="cust-phone" className={controlClass()} value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Address is optional — only needed if you plan to ship to this customer.
            </p>
            <div>
              <Label htmlFor="cust-addr1">Address line 1</Label>
              <input id="cust-addr1" className={controlClass()} value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cust-city">City</Label>
                <input id="cust-city" className={controlClass()} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="cust-country">Country</Label>
                <select id="cust-country" className={controlClass()} value={form.countryId || ""} onChange={(e) => setForm((f) => ({ ...f, countryId: Number(e.target.value) }))}>
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {voidTarget ? (
        <Dialog title="Remove customer?" subtitle={voidTarget.name} onClose={() => setVoidTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#2D241E]/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              This hides the customer from future sales. Past sales orders are unaffected.
            </p>
            <div className="flex justify-end gap-2">
              <Button tone="light" onClick={() => setVoidTarget(null)}>Cancel</Button>
              <Button tone="danger" onClick={() => void confirmVoid()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Remove
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
