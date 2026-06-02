// Locale-aware wrapper around react-router's useNavigate.
// Use whenever you `navigate("/collection")` and want to land on /:lang/collection.

import { useCallback } from "react";
import { useNavigate, type NavigateOptions } from "react-router";
import { useLocale, withLocale } from "./useLocale";

export function useLangNavigate() {
  const navigate = useNavigate();
  const locale = useLocale();
  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      navigate(withLocale(to, locale), options);
    },
    [navigate, locale]
  );
}
