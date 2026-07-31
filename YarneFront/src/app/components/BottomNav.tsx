import { Home, ShoppingBag, User, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { useCart, useAuth, useOverlay } from "../context/AppContext";
import { LangLink } from "../i18n/LangLink";
import { motion } from "motion/react";
import { stripLocaleFromPath } from "../i18n/useLocale";

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { cartCount } = useCart();
  const { isLoggedIn } = useAuth();
  const { openLogin, openCart } = useOverlay();

  const barePath = stripLocaleFromPath(location.pathname);
  const isHome = barePath === "/";
  const isCollection = barePath === "/collection" || barePath.startsWith("/collection?");
  const isAccount = barePath === "/account";

  const navItems = [
    {
      key: "home",
      icon: Home,
      label: t("header.home"),
      to: "/",
      active: isHome,
    },
    {
      key: "collection",
      icon: Search,
      label: t("header.collection"),
      to: "/collection",
      active: isCollection,
    },
    {
      key: "cart",
      icon: ShoppingBag,
      label: t("header.cart"),
      onClick: openCart,
      badge: cartCount,
    },
    {
      key: "account",
      icon: User,
      label: isLoggedIn ? t("header.myAccount") : t("header.signIn"),
      to: isLoggedIn ? "/account" : undefined,
      onClick: isLoggedIn ? undefined : openLogin,
      active: isAccount,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#2D241E]/8"
      style={{
        backgroundColor: "rgba(245,242,237,0.98)",
        backdropFilter: "blur(20px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active || false;

          const content = (
            <div className="flex flex-col items-center gap-1 py-2 px-4 relative">
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  style={{
                    color: isActive ? "#4A0E0E" : "#2D241E",
                    transition: "color 200ms ease",
                  }}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center text-white"
                    style={{
                      backgroundColor: "#4A0E0E",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </div>
              <span
                className="text-[10px] tracking-wider uppercase"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.08em",
                  color: isActive ? "#4A0E0E" : "#2D241E",
                  transition: "color 200ms ease",
                }}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.to) {
            return (
              <LangLink key={item.key} to={item.to} className="flex-1 flex justify-center">
                {content}
              </LangLink>
            );
          }

          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className="flex-1 flex justify-center cursor-pointer"
              style={{ touchAction: "manipulation" }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
