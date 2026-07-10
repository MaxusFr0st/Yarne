import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Search, ShoppingBag, User, Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useCart, useOverlay, useAuth } from "../context/AppContext";
import { Logo } from "./Logo";
import { LangLink } from "../i18n/LangLink";
import { useLangNavigate } from "../i18n/useLangNavigate";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { LOCALE_DISPLAY, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type Locale } from "../i18n/config";
import { stripLocaleFromPath, useLocale } from "../i18n/useLocale";
import { preserveScrollForLocaleSwitch } from "../i18n/localeNavigation";
import { clearAllScrollPositions } from "../utils/scrollRestoration";
import { scrollToPageTop } from "../utils/scrollToTop";

export function Header() {
  const { t, i18n } = useTranslation();
  const { cartCount } = useCart();
  const { openCart, openLogin } = useOverlay();
  const { isLoggedIn, user, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const skipScrollStyle = useTouchMobileLayout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useLangNavigate();
  const rawNavigate = useNavigate();
  const locale = useLocale();

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    clearAllScrollPositions();
    scrollToPageTop();
    if (stripLocaleFromPath(location.pathname) === "/") {
      event.preventDefault();
    }
  };

  const activeLocale = (SUPPORTED_LOCALES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Locale)
    : "en";

  const changeLocale = (next: Locale) => {
    if (next === activeLocale) return;
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* ignore */ }
    preserveScrollForLocaleSwitch();
    void i18n.changeLanguage(next);
    if (location.pathname === "/admin" || location.pathname.startsWith("/admin/")) {
      rawNavigate("/admin", { replace: true });
      return;
    }
    const rest = stripLocaleFromPath(location.pathname);
    const target = `/${next}${rest === "/" ? "" : rest}${location.search}${location.hash}`;
    rawNavigate(target || `/${next}`, { replace: true });
  };

  // Orphan routes (Journal, About) currently 404. Hide until those pages
  // exist; revive by adding entries to RIGHT_NAV_LINKS.
  const LEFT_NAV_LINKS = [
    { key: "home", label: t("header.home"), href: "/" },
    { key: "collection", label: t("header.collection"), href: "/collection" },
  ];
  const RIGHT_NAV_LINKS: Array<{ key: string; label: string; href: string }> =
    [];

  useEffect(() => {
    if (skipScrollStyle) return;

    // Hysteresis: set scrolled at >40px, clear it only when <20px.
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(prev => (prev ? y > 20 : y > 40));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [skipScrollStyle]);

  useEffect(() => {
    setMobileOpen(false);
    setLangOpen(false);
  }, [location]);

  useEffect(() => {
    if (!langOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLangOpen(false); };
    const onOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [langOpen]);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 4px)",
          minHeight: "calc(var(--main-header-h) + env(safe-area-inset-top, 0px))",
          backgroundColor: skipScrollStyle
            ? "rgba(245,242,237,0.95)"
            : scrolled
              ? "rgba(245,242,237,0.92)"
              : "rgba(245,242,237,0.7)",
          backdropFilter: skipScrollStyle ? "none" : scrolled ? "blur(20px)" : "blur(8px)",
          borderBottom: skipScrollStyle
            ? "1px solid rgba(45,36,30,0.08)"
            : scrolled
              ? "1px solid rgba(45,36,30,0.08)"
              : "1px solid transparent",
          transition: skipScrollStyle
            ? undefined
            : "background-color 500ms ease, backdrop-filter 500ms ease, border-color 500ms ease",
          willChange: "transform",
        }}
        initial={false}
        animate={{ y: 0 }}
        transition={{ duration: 0 }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[52px] md:h-[60px]">
            {/* Left: mobile hamburger + lang dropdown / desktop nav */}
            <div className="flex items-center justify-self-start min-w-0 gap-1">
              <nav className="hidden md:flex items-center gap-8 justify-start">
                {LEFT_NAV_LINKS.map((link) => (
                  <LangLink
                    key={link.key}
                    to={link.href}
                    className="text-[#2D241E] text-sm tracking-widest uppercase hover:text-[#4A0E0E] transition-colors duration-300"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                  >
                    {link.label}
                  </LangLink>
                ))}
              </nav>

              {/* Mobile: Hamburger */}
              <button
                className="md:hidden flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-[#2D241E] hover:bg-[#2D241E]/5 transition-colors duration-200 cursor-pointer"
                onClick={() => setMobileOpen(true)}
                aria-label={t("header.openMenu")}
                style={{ touchAction: "manipulation" }}
              >
                <Menu size={22} strokeWidth={1.5} />
              </button>

              {/* Mobile: Language dropdown — left of logo */}
              <div ref={langRef} className="md:hidden relative">
                <button
                  type="button"
                  onClick={() => setLangOpen(o => !o)}
                  aria-expanded={langOpen}
                  aria-haspopup="listbox"
                  aria-label={t("language.label")}
                  className="flex items-center gap-[3px] h-8 px-1.5 rounded-[4px] text-[#2D241E] hover:bg-[#2D241E]/5 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2D241E] focus-visible:outline-offset-2"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.68rem",
                    letterSpacing: "0.14em",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span className="uppercase">{LOCALE_DISPLAY[activeLocale].short}</span>
                  <ChevronDown
                    size={10}
                    strokeWidth={2}
                    className="transition-transform duration-200"
                    style={{ transform: langOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {langOpen && (
                    <motion.ul
                      role="listbox"
                      aria-label={t("language.label")}
                      className="absolute left-0 top-full mt-1 z-[60] rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(45,36,30,0.12)] border border-[#2D241E]/8"
                      style={{ backgroundColor: "#F5F2ED", minWidth: "72px" }}
                      initial={{ opacity: 0, y: -6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      {SUPPORTED_LOCALES.filter(code => code !== activeLocale).map(code => (
                        <li key={code} role="option" aria-selected={false}>
                          <button
                            type="button"
                            onClick={() => { changeLocale(code); setLangOpen(false); }}
                            className="w-full text-left px-3 py-2.5 text-[#2D241E]/55 hover:text-[#2D241E] hover:bg-[#2D241E]/5 transition-colors duration-150 cursor-pointer"
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.68rem",
                              letterSpacing: "0.14em",
                              touchAction: "manipulation",
                              WebkitTapHighlightColor: "transparent",
                            }}
                            aria-label={LOCALE_DISPLAY[code].native}
                          >
                            <span className="uppercase">{LOCALE_DISPLAY[code].short}</span>
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Center Logo */}
            <LangLink to="/" className="flex items-center justify-center justify-self-center text-[#2D241E]" onClick={handleLogoClick}>
              <Logo
                title="Yarné – The Knit Gallery"
                className="h-6 md:h-7 w-auto"
              />
            </LangLink>

            {/* Right: cart (all breakpoints) + desktop actions */}
            <div className="flex items-center justify-self-end justify-end gap-1.5 sm:gap-2 md:gap-6">
            <div className="hidden md:flex items-center gap-6">
              {RIGHT_NAV_LINKS.map((link) => (
                <LangLink
                  key={link.key}
                  to={link.href}
                  className="text-[#2D241E] text-sm tracking-widest uppercase hover:text-[#4A0E0E] transition-colors duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                >
                  {link.label}
                </LangLink>
              ))}
              {isAdmin && (
                <LangLink
                  to="/admin"
                  className="text-[#2D241E] text-sm tracking-widest uppercase hover:text-[#4A0E0E] transition-colors duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                >
                  {t("header.admin")}
                </LangLink>
              )}
              <LanguageSwitcher className="ml-1" />
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300"
                aria-label={t("header.search")}
              >
                <Search size={20} strokeWidth={1.5} />
              </button>
              {isLoggedIn ? (
                <LangLink
                  to="/account"
                  className="hidden md:flex text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300"
                  aria-label={t("header.myAccount")}
                  title={user?.name ? `${t("header.myAccount")} — ${user.name}` : t("header.myAccount")}
                >
                  <User size={20} strokeWidth={1.5} />
                </LangLink>
              ) : (
                <button
                  onClick={openLogin}
                  className="hidden md:flex text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300"
                  aria-label={t("header.signIn")}
                  title={t("header.signIn")}
                >
                  <User size={20} strokeWidth={1.5} />
                </button>
              )}
            </div>

              {/* Mobile: account + cart */}
              <div className="flex md:hidden items-center gap-0.5">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => navigate("/account")}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-[#2D241E] hover:bg-[#2D241E]/5 transition-colors duration-200 cursor-pointer"
                    aria-label={t("header.myAccount")}
                    title={user?.name ? `${t("header.myAccount")} — ${user.name}` : t("header.myAccount")}
                  >
                    <User size={20} strokeWidth={1.5} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openLogin}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-[#2D241E] hover:bg-[#2D241E]/5 transition-colors duration-200 cursor-pointer"
                    aria-label={t("header.signIn")}
                    title={t("header.signIn")}
                  >
                    <User size={20} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={openCart}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full text-[#2D241E] hover:bg-[#2D241E]/5 transition-colors duration-200 cursor-pointer"
                  aria-label={t("header.cart")}
                >
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center text-white"
                      style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </button>
              </div>

              {/* Desktop cart */}
              <button
                onClick={openCart}
                className="relative hidden md:flex text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300 cursor-pointer"
                aria-label={t("header.cart")}
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
                    style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(45,36,30,0.4)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 z-50 w-80 flex flex-col"
              style={{ backgroundColor: "#F5F2ED" }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2D241E]/10">
                <Logo title="Yarné" className="h-7 w-auto text-[#2D241E]" />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-[#2D241E]"
                  aria-label={t("header.closeMenu")}
                >
                  <X size={22} />
                </button>
              </div>
              <nav className="flex-1 p-8 flex flex-col gap-6">
                {[
                  ...LEFT_NAV_LINKS,
                  ...RIGHT_NAV_LINKS,
                  ...(isAdmin ? [{ key: "admin", label: t("header.admin"), href: "/admin" }] : []),
                ].map((link, i) => (
                  <motion.div
                    key={link.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <LangLink
                      to={link.href}
                      className="text-[#2D241E] uppercase tracking-widest hover:text-[#4A0E0E] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em", fontSize: "0.85rem" }}
                    >
                      {link.label}
                    </LangLink>
                  </motion.div>
                ))}
                {isLoggedIn && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (LEFT_NAV_LINKS.length + RIGHT_NAV_LINKS.length) * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <LangLink
                      to="/account"
                      className="text-[#4A0E0E] uppercase tracking-widest hover:opacity-80 transition-opacity"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em", fontSize: "0.85rem" }}
                    >
                      {t("header.myAccount")}
                    </LangLink>
                  </motion.div>
                )}
                <div className="pt-4 mt-2 border-t border-[#2D241E]/10">
                  <LanguageSwitcher variant="full" />
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
            style={{ backgroundColor: "rgba(245,242,237,0.96)", backdropFilter: "blur(24px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-8 right-8 text-[#2D241E]/60 hover:text-[#2D241E] transition-colors"
              aria-label={t("header.closeMenu")}
            >
              <X size={24} />
            </button>
            <motion.div
              className="w-full max-w-2xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <p
                className="text-[#2D241E]/50 text-center mb-8 tracking-widest uppercase text-xs"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
              >
                {t("header.searchTitle")}
              </p>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("header.searchPlaceholder")}
                  autoFocus
                  className="w-full bg-transparent border-0 border-b-2 border-[#2D241E]/20 focus:border-[#4A0E0E] focus:outline-none pb-4 text-[#2D241E] placeholder-[#2D241E]/30 text-xl transition-colors duration-300"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                />
                <Search className="absolute right-0 bottom-4 text-[#2D241E]/40" size={22} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
