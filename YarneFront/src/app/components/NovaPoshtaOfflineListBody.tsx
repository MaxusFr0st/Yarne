import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import type { NovaPoshtaSelection } from "./NovaPoshtaPicker";
import {
  getCachedCities,
  getCachedWarehouses,
  getLastUsedBranch,
  saveLastUsedBranch,
  type CachedCity,
  type CachedWarehouse,
} from "../offline/shippingCache";

/**
 * Offline counterpart to NovaPoshtaOnlineWidgetBody — same job (pick a city,
 * then a branch), backed by whatever's cached in IndexedDB instead of the
 * live cross-origin widget. Renders inside the same shell, so it never needs
 * to reproduce the overlay/sheet/header — only this content area.
 */
export function NovaPoshtaOfflineListBody({
  onSelect,
  onClose,
}: {
  onSelect: (selection: NovaPoshtaSelection) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [cities, setCities] = useState<CachedCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<CachedCity | null>(null);
  const [warehouses, setWarehouses] = useState<CachedWarehouse[] | null>(null);
  const [lastUsed, setLastUsed] = useState<NovaPoshtaSelection | null>(null);

  useEffect(() => {
    getCachedCities().then(setCities).catch(() => setCities([]));
    getLastUsedBranch().then(setLastUsed).catch(() => setLastUsed(null));
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setWarehouses(null);
      return;
    }
    let cancelled = false;
    getCachedWarehouses(selectedCity.ref)
      .then((rows) => {
        if (!cancelled) setWarehouses(rows);
      })
      .catch(() => {
        if (!cancelled) setWarehouses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const chooseWarehouse = (warehouse: CachedWarehouse) => {
    const selection: NovaPoshtaSelection = {
      cityRef: warehouse.cityRef,
      cityName: selectedCity?.name ?? "",
      warehouseRef: warehouse.ref,
      warehouseName: warehouse.description || warehouse.shortAddress || warehouse.number,
    };
    void saveLastUsedBranch(selection);
    onSelect(selection);
    onClose();
  };

  const useLastUsedBranch = () => {
    if (!lastUsed) return;
    onSelect(lastUsed);
    onClose();
  };

  const textStyle = { fontFamily: "'DM Sans', sans-serif" } as const;

  // Step 2: a city is picked — show its cached branches, or the no-data fallback.
  if (selectedCity) {
    return (
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={() => setSelectedCity(null)}
          className="shrink-0 flex items-center gap-1.5 px-4 sm:px-5 py-2.5 cursor-pointer"
          style={{ ...textStyle, fontSize: "0.8rem", color: "rgba(45,36,30,0.6)" }}
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
          {selectedCity.name}
        </button>

        {warehouses === null ? (
          <div className="flex-1 flex items-center justify-center" style={{ ...textStyle, fontSize: "0.8rem", color: "rgba(45,36,30,0.45)" }}>
            {t("checkout.deliveryPickerLoading")}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <img src="/NocaPostOfflineIcon.png" alt="" className="w-16 h-16" />
            <p style={{ ...textStyle, fontSize: "0.85rem", color: "rgba(45,36,30,0.6)" }}>
              {t("checkout.deliveryNoBranchesCached")}
            </p>
            {lastUsed && (
              <button
                type="button"
                onClick={useLastUsedBranch}
                className="rounded-full px-5 py-2.5 cursor-pointer"
                style={{ ...textStyle, fontSize: "0.8rem", backgroundColor: "#2D241E", color: "#F5F2ED" }}
              >
                {t("checkout.deliveryUseLastBranch")}
              </button>
            )}
          </div>
        ) : (
          <Command className="flex-1 min-h-0">
            <CommandInput placeholder={t("checkout.deliverySearchBranch")} />
            <CommandList>
              <CommandEmpty>{t("checkout.deliveryNoCityMatch")}</CommandEmpty>
              {warehouses.map((warehouse) => (
                <CommandItem
                  key={warehouse.ref}
                  value={`${warehouse.description} ${warehouse.shortAddress} ${warehouse.number}`}
                  onSelect={() => chooseWarehouse(warehouse)}
                >
                  {warehouse.description || warehouse.shortAddress}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        )}
      </div>
    );
  }

  // Step 1: search/pick a city.
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      {cities.length === 0 && lastUsed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <img src="/NocaPostOfflineIcon.png" alt="" className="w-16 h-16" />
          <p style={{ ...textStyle, fontSize: "0.85rem", color: "rgba(45,36,30,0.6)" }}>
            {t("checkout.deliveryNoBranchesCached")}
          </p>
          <button
            type="button"
            onClick={useLastUsedBranch}
            className="rounded-full px-5 py-2.5 cursor-pointer"
            style={{ ...textStyle, fontSize: "0.8rem", backgroundColor: "#2D241E", color: "#F5F2ED" }}
          >
            {t("checkout.deliveryUseLastBranch")}
          </button>
        </div>
      ) : (
        <Command className="flex-1 min-h-0">
          <CommandInput placeholder={t("checkout.deliverySearchCity")} />
          <CommandList>
            <CommandEmpty>{t("checkout.deliveryNoCityMatch")}</CommandEmpty>
            {cities.map((city) => (
              <CommandItem key={city.ref} value={city.name} onSelect={() => setSelectedCity(city)}>
                {city.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      )}
    </div>
  );
}
