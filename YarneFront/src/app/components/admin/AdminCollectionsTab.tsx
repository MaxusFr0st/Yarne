import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createCollection,
  deleteCollection,
  fetchCollection,
  fetchCollections,
  setCollectionProducts,
  updateCollection,
  type CollectionDto,
} from "../../api/collections";
import { invalidateProductsCache } from "../../utils/productsCache";
import {
  AdminModalShell,
  AdminModalCancelButton,
  AdminModalPrimaryButton,
} from "./AdminModalShell";

const easing = [0.25, 0.1, 0.25, 1] as const;

const ADD_BTN =
  "flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]";
const ICON_BTN =
  "w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30";

type ProductOption = { idNum: number; name: string; sku: string };

type Props = {
  products: ProductOption[];
  onError?: (message: string) => void;
};

type CollectionModalState =
  | { open: false }
  | { open: true; editing: CollectionDto | null; name: string; startDate: string; endDate: string };

type ProductsModalState =
  | { open: false }
  | { open: true; collection: CollectionDto; selectedIds: Set<number> };

export function AdminCollectionsTab({ products, onError }: Props) {
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionModal, setCollectionModal] = useState<CollectionModalState>({ open: false });
  const [productsModal, setProductsModal] = useState<ProductsModalState>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<CollectionDto | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCollections();
      setCollections(data);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to load collections.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const [productSearch, setProductSearch] = useState("");

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return sortedProducts;
    return sortedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query),
    );
  }, [sortedProducts, productSearch]);

  const openCreate = () => {
    setCollectionModal({ open: true, editing: null, name: "", startDate: "", endDate: "" });
  };

  const openEdit = (collection: CollectionDto) => {
    setCollectionModal({
      open: true,
      editing: collection,
      name: collection.name,
      startDate: collection.startDate?.slice(0, 10) ?? "",
      endDate: collection.endDate?.slice(0, 10) ?? "",
    });
  };

  const saveCollection = async () => {
    if (!collectionModal.open) return;
    const name = collectionModal.name.trim();
    if (!name) {
      onError?.("Collection name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        startDate: collectionModal.startDate || null,
        endDate: collectionModal.endDate || null,
      };
      if (collectionModal.editing) {
        await updateCollection(collectionModal.editing.id, payload);
      } else {
        await createCollection(payload);
      }
      setCollectionModal({ open: false });
      await loadCollections();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to save collection.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCollection(deleteTarget.id);
      invalidateProductsCache();
      setDeleteTarget(null);
      await loadCollections();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to delete collection.");
    } finally {
      setSaving(false);
    }
  };

  const openProducts = async (collection: CollectionDto) => {
    setSaving(true);
    try {
      const detail = await fetchCollection(collection.id);
      setProductsModal({
        open: true,
        collection,
        selectedIds: new Set(detail.productIds),
      });
      setProductSearch("");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to load collection products.");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = async () => {
    if (!productsModal.open) return;
    setSaving(true);
    try {
      await setCollectionProducts(productsModal.collection.id, Array.from(productsModal.selectedIds));
      invalidateProductsCache();
      setProductsModal({ open: false });
      await loadCollections();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to update collection products.");
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (id: number) => {
    if (!productsModal.open) return;
    setProductsModal((prev) => {
      if (!prev.open) return prev;
      const next = new Set(prev.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, selectedIds: next };
    });
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    color: "rgba(45,36,30,0.45)",
    letterSpacing: "0.1em",
  };
  const fieldInput =
    "w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/20";
  const fieldInputStyle: React.CSSProperties = {
    borderColor: "rgba(45,36,30,0.15)",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <motion.div
      key="collections"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: easing }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {loading ? "Loading…" : `${collections.length} collections`}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className={ADD_BTN}
          style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
        >
          <Plus size={15} />
          <span className="uppercase tracking-widest">Add Collection</span>
        </button>
      </div>

      <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
        <div
          className="grid px-6 py-4 text-xs tracking-widest uppercase"
          style={{
            gridTemplateColumns: "1.5fr 1fr 1fr 140px",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.12em",
            color: "rgba(45,36,30,0.4)",
            backgroundColor: "rgba(45,36,30,0.03)",
            borderBottom: "1px solid rgba(45,36,30,0.06)",
          }}
        >
          <span>Collection</span>
          <span>Items</span>
          <span>Dates</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
          {!loading && collections.length === 0 ? (
            <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              No collections yet. Create Summer, Fall, or seasonal edits here.
            </p>
          ) : (
            collections.map((collection) => (
              <div
                key={collection.id}
                className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.03] transition-colors gap-3"
                style={{ gridTemplateColumns: "1.5fr 1fr 1fr 140px" }}
              >
                <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>
                  {collection.name}
                </p>
                <p className="text-[#2D241E]/55 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {collection.productCount ?? 0} products
                </p>
                <p className="text-[#2D241E]/45 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {collection.startDate || collection.endDate
                    ? `${collection.startDate?.slice(0, 10) ?? "—"} → ${collection.endDate?.slice(0, 10) ?? "—"}`
                    : "—"}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void openProducts(collection)}
                    className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest border hover:bg-[#2D241E]/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                    style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                  >
                    Items
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(collection)}
                    className={`${ICON_BTN} hover:bg-[#2D241E]/8`}
                    title="Edit"
                    aria-label={`Edit ${collection.name}`}
                  >
                    <Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(collection)}
                    className={`${ICON_BTN} hover:bg-[#4A0E0E]/8`}
                    title="Delete"
                    aria-label={`Delete ${collection.name}`}
                  >
                    <Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {collectionModal.open && (
        <AdminModalShell
          eyebrow={collectionModal.editing ? "Edit Collection" : "New Collection"}
          title={collectionModal.editing ? collectionModal.editing.name : "Add Collection"}
          onClose={() => setCollectionModal({ open: false })}
          bodyClassName="p-8 space-y-4"
          footer={
            <>
              <AdminModalCancelButton onClick={() => setCollectionModal({ open: false })} />
              <AdminModalPrimaryButton onClick={() => void saveCollection()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </AdminModalPrimaryButton>
            </>
          }
        >
          <div>
            <label className="block text-xs uppercase mb-1.5" style={fieldLabelStyle}>Name</label>
            <input
              value={collectionModal.name}
              onChange={(e) => setCollectionModal((prev) => (prev.open ? { ...prev, name: e.target.value } : prev))}
              className={fieldInput}
              style={fieldInputStyle}
              placeholder="e.g. Summer Collection"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase mb-1.5" style={fieldLabelStyle}>Start date</label>
              <input
                type="date"
                value={collectionModal.startDate}
                onChange={(e) => setCollectionModal((prev) => (prev.open ? { ...prev, startDate: e.target.value } : prev))}
                className={`${fieldInput} px-3`}
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label className="block text-xs uppercase mb-1.5" style={fieldLabelStyle}>End date</label>
              <input
                type="date"
                value={collectionModal.endDate}
                onChange={(e) => setCollectionModal((prev) => (prev.open ? { ...prev, endDate: e.target.value } : prev))}
                className={`${fieldInput} px-3`}
                style={fieldInputStyle}
              />
            </div>
          </div>
        </AdminModalShell>
      )}

      {productsModal.open && (
        <AdminModalShell
          eyebrow="Collection products"
          title={productsModal.collection.name}
          onClose={() => setProductsModal({ open: false })}
          maxWidth="lg"
          bodyClassName="px-8 pb-4 pt-6 flex flex-col min-h-0 gap-4"
          footer={
            <>
              <AdminModalCancelButton onClick={() => setProductsModal({ open: false })} />
              <AdminModalPrimaryButton onClick={() => void saveProducts()} disabled={saving}>
                {saving ? "Saving…" : "Save Products"}
              </AdminModalPrimaryButton>
            </>
          }
        >
          <p className="text-[#2D241E]/45 text-xs -mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {productsModal.selectedIds.size} products selected
          </p>
          <input
            type="search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search products…"
            className={fieldInput}
            style={{ ...fieldInputStyle, fontSize: "0.85rem" }}
          />
          <div
            className="flex-1 min-h-0 overflow-y-auto divide-y rounded-[16px] border max-h-[40vh]"
            style={{ borderColor: "rgba(45,36,30,0.08)" }}
          >
            {visibleProducts.map((product) => {
              const selected = productsModal.selectedIds.has(product.idNum);
              return (
                <button
                  key={product.idNum}
                  type="button"
                  onClick={() => toggleProduct(product.idNum)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#2D241E]/[0.03] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2D241E]/20"
                >
                  <div>
                    <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{product.name}</p>
                    <p className="text-[#2D241E]/40 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>{product.sku}</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "0.1em",
                      backgroundColor: selected ? "rgba(74,14,14,0.1)" : "rgba(45,36,30,0.06)",
                      color: selected ? "#4A0E0E" : "rgba(45,36,30,0.45)",
                    }}
                  >
                    {selected ? "In" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        </AdminModalShell>
      )}

      {deleteTarget && (
        <AdminModalShell
          eyebrow="Confirm"
          title={`Delete “${deleteTarget.name}”?`}
          onClose={() => setDeleteTarget(null)}
          maxWidth="sm"
          bodyClassName="px-8 pt-6 pb-2"
          footerClassName="flex gap-3 px-8 py-6"
          footer={
            <>
              <AdminModalCancelButton onClick={() => setDeleteTarget(null)} className="flex-1" />
              <AdminModalPrimaryButton onClick={() => void confirmDelete()} variant="danger" disabled={saving} className="flex-1">
                {saving ? "Deleting…" : "Delete"}
              </AdminModalPrimaryButton>
            </>
          }
        >
          <p className="text-[#2D241E]/55 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
            Products in this collection will be unassigned, not deleted.
          </p>
        </AdminModalShell>
      )}
    </motion.div>
  );
}
