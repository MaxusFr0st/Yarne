// Drop-in replacement for react-router's <Link>.
// Auto-prepends the active /:lang prefix when `to` is a string path.

import type { ComponentProps } from "react";
import { Link } from "react-router";
import { useLocale, withLocale } from "./useLocale";

type LangLinkProps = Omit<ComponentProps<typeof Link>, "to"> & {
  to: string; // We intentionally narrow to string-only; objects are uncommon here.
};

export function LangLink({ to, ...rest }: LangLinkProps) {
  const locale = useLocale();
  return <Link to={withLocale(to, locale)} {...rest} />;
}
