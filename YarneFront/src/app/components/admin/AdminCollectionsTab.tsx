import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createCollection,
  deleteCollection,
  fetchCollection,
  fetchCollections,
  setCollectionProducts,
  updateCollection,
  type CollectionDto,
} from "../../api/collections";

const easing = [0.25, 0.1, 0.25, 1] as const;

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

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

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
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
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
                className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors gap-3"
                style={{ gridTemplateColumns: "1.5fr 1fr 1fr 140px" }}
              >
                <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
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
                    onClick={() => void openProducts(collection)}
                    className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest border hover:bg-[#2D241E]/5"
                    style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                  >
                    Items
                  </button>
                  <button onClick={() => openEdit(collection)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors" title="Edit">
                    <Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} />
                  </button>
                  <button onClick={() => setDeleteTarget(collection)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors" title="Delete">
                    <Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {collectionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.45)" }}>
          <div className="w-full max-w-md rounded-[24px] p-6" style={{ backgroundColor: "#F5F2ED" }}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem" }}>
                {collectionModal.editing ? "Edit Collection" : "New Collection"}
              </p>
              <button onClick={() => setCollectionModal({ open: false })} className="text-[#2D241E]/40 hover:text-[#2D241E]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#2D241E]/50 mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Name</label>
                <input
                  value={collectionModal.name}
                  onChange={(e) => setCollectionModal((prev) => (prev.open ? { ...prev, name: e.target.value } : prev))}
                  className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
                  style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif" }}
                  placeholder="e.g. Summer Collection"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#2D241E]/50 mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Start date</label>
                  <input
                    type="date"
                    value={collectionModal.startDate}
                    onChange={(e) => setCollectionModal((prev) => (prev.open ? { ...prev, startDate: e.target.value } : prev))}
                    className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                    style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#2D241E]/50 mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>End date</label>
                  <input
                    type="date"
                    value={collectionModal.endDate}
                    onChange={(e) => setCollectionModal((prev) => (prev.open ? { ...prev, endDate: e.target.value } : prev))}
                    className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                    style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCollectionModal({ open: false })} className="px-5 py-2.5 rounded-full text-sm text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={() => void saveCollection()}
                disabled={saving}
                className="px-6 py-2.5 rounded-full text-[#F5F2ED] disabled:opacity-50"
                style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em" }}
              >
                <span className="uppercase tracking-widest">{saving ? "Saving…" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {productsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.45)" }}>
          <div className="w-full max-w-lg rounded-[24px] p-6 max-h-[85vh] flex flex-col" style={{ backgroundColor: "#F5F2ED" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem" }}>
                  {productsModal.collection.name}
                </p>
                <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {productsModal.selectedIds.size} products selected
                </p>
              </div>
              <button onClick={() => setProductsModal({ open: false })} className="text-[#2D241E]/40 hover:text-[#2D241E]">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y rounded-[16px] border" style={{ borderColor: "rgba(45,36,30,0.08)" }}>
              {sortedProducts.map((product) => {
                const selected = productsModal.selectedIds.has(product.idNum);
                return (
                  <button
                    key={product.idNum}
                    type="button"
                    onClick={() => toggleProduct(product.idNum)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#2D241E]/[0.03] transition-colors"
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
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setProductsModal({ open: false })} className="px-5 py-2.5 rounded-full text-sm text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={() => void saveProducts()}
                disabled={saving}
                className="px-6 py-2.5 rounded-full text-[#F5F2ED] disabled:opacity-50"
                style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em" }}
              >
                <span className="uppercase tracking-widest">{saving ? "Saving…" : "Save Products"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.45)" }}>
          <div className="w-full max-w-sm rounded-[24px] p-6" style={{ backgroundColor: "#F5F2ED" }}>
            <p className="text-[#2D241E] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem" }}>
              Delete collection?
            </p>
            <p className="text-[#2D241E]/55 text-sm mb-6" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
              “{deleteTarget.name}” will be removed. Products in this collection will be unassigned, not deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 rounded-full text-sm text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={saving}
                className="px-6 py-2.5 rounded-full text-[#F5F2ED] disabled:opacity-50"
                style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
