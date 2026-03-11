import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Search, ShoppingBag, User, Menu, X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import logoImg from "../../assets/logo.png";

const NAV_LINKS = [
  { label: "Collection", href: "/collection" },
  { label: "New Arrivals", href: "/collection?filter=new" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

export function Header() {
  const { cartCount, openCart, openLogin, isLoggedIn, user } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? "rgba(245,242,237,0.92)" : "rgba(245,242,237,0.7)",
          backdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          borderBottom: scrolled ? "1px solid rgba(45,36,30,0.08)" : "1px solid transparent",
        }}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Left Nav – Desktop */}
            <nav className="hidden md:flex items-center gap-8 flex-1">
              {NAV_LINKS.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-[#2D241E] text-sm tracking-widest uppercase hover:text-[#4A0E0E] transition-colors duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile: Hamburger */}
            <button
              className="md:hidden text-[#2D241E] p-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            {/* Center Logo */}
            <Link to="/" className="flex items-center justify-center flex-shrink-0">
              <img
                src={logoImg}
                alt="Yarné – The Knit Gallery"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </Link>

            {/* Right Nav – Desktop */}
            <div className="hidden md:flex items-center gap-8 flex-1 justify-end">
              {NAV_LINKS.slice(2).map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-[#2D241E] text-sm tracking-widest uppercase hover:text-[#4A0E0E] transition-colors duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-4 ml-6">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300"
                aria-label="Search"
              >
                <Search size={20} strokeWidth={1.5} />
              </button>
              <button
                onClick={isLoggedIn ? undefined : openLogin}
                className="hidden md:flex text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300"
                aria-label="Account"
                title={isLoggedIn ? `Hello, ${user?.name}` : "Sign in"}
              >
                <User size={20} strokeWidth={1.5} />
              </button>
              <button
                onClick={openCart}
                className="relative text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-300"
                aria-label="Cart"
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
                <img src={logoImg} alt="Yarné" className="h-10 w-auto" />
                <button onClick={() => setMobileOpen(false)} className="text-[#2D241E]">
                  <X size={22} />
                </button>
              </div>
              <nav className="flex-1 p-8 flex flex-col gap-6">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Link
                      to={link.href}
                      className="text-[#2D241E] uppercase tracking-widest hover:text-[#4A0E0E] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em", fontSize: "0.85rem" }}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="p-8 flex gap-6 border-t border-[#2D241E]/10">
                <button onClick={() => { setSearchOpen(true); setMobileOpen(false); }} className="text-[#2D241E]">
                  <Search size={20} strokeWidth={1.5} />
                </button>
                <button onClick={() => { openLogin(); setMobileOpen(false); }} className="text-[#2D241E]">
                  <User size={20} strokeWidth={1.5} />
                </button>
                <button onClick={() => { openCart(); setMobileOpen(false); }} className="relative text-[#2D241E]">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white bg-[#4A0E0E]">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
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
                Search The Knit Gallery
              </p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cashmere, turtleneck, bouclé..."
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
