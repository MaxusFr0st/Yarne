import { Link } from "react-router";
import { Instagram, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";

export function Footer() {
  const { t } = useTranslation();
  const columns = [
    {
      title: t("footer.columns.shop.title"),
      links: t("footer.columns.shop.items", { returnObjects: true }) as string[],
    },
    {
      title: t("footer.columns.brand.title"),
      links: t("footer.columns.brand.items", { returnObjects: true }) as string[],
    },
    {
      title: t("footer.columns.help.title"),
      links: t("footer.columns.help.items", { returnObjects: true }) as string[],
    },
    {
      title: t("footer.columns.connect.title"),
      links: t("footer.columns.connect.items", { returnObjects: true }) as string[],
    },
  ];

  return (
    <footer
      className="mt-32 border-t border-[#2D241E]/10"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
        {/* Top: Logo + Tagline */}
        <div className="flex flex-col items-center text-center mb-16">
          <Logo title="Yarné" className="h-10 w-auto mb-4 text-[#2D241E] opacity-80" />
          <p
            className="text-[#2D241E]/40 max-w-xs"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic" }}
          >
            {t("footer.tagline")}
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {columns.map((col) => (
            <div key={col.title}>
              <p
                className="text-[#2D241E] mb-5 tracking-widest uppercase text-xs"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
              >
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="#"
                      className="text-[#2D241E]/55 hover:text-[#4A0E0E] transition-colors duration-300 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div
          className="rounded-[32px] p-8 md:p-12 mb-16 text-center"
          style={{ backgroundColor: "#EDE9E2" }}
        >
          <p
            className="text-[#2D241E] mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}
          >
            {t("footer.newsletter.title")}
          </p>
          <p
            className="text-[#2D241E]/50 text-sm mb-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {t("footer.newsletter.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t("footer.newsletter.placeholder")}
              className="flex-1 bg-white/70 border border-[#2D241E]/15 rounded-full px-6 py-3.5 text-[#2D241E] placeholder-[#2D241E]/30 focus:outline-none focus:border-[#2D241E]/40 transition-colors text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            <button
              className="px-8 py-3.5 rounded-full text-white text-sm transition-all duration-300 hover:opacity-90 whitespace-nowrap"
              style={{
                backgroundColor: "#2D241E",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.12em",
                fontSize: "0.75rem",
              }}
            >
              <span className="uppercase tracking-widest">{t("footer.newsletter.submit")}</span>
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#2D241E]/8">
          <p
            className="text-[#2D241E]/35 text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[#2D241E]/40 hover:text-[#4A0E0E] transition-colors" aria-label="Instagram">
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a href="#" className="text-[#2D241E]/40 hover:text-[#4A0E0E] transition-colors" aria-label="YouTube">
              <Youtube size={18} strokeWidth={1.5} />
            </a>
          </div>
          <div className="flex items-center gap-6">
            {[
              { key: "privacy", label: t("footer.legal.privacy") },
              { key: "terms", label: t("footer.legal.terms") },
              { key: "cookies", label: t("footer.legal.cookies") },
            ].map((item) => (
              <Link
                key={item.key}
                to="#"
                className="text-[#2D241E]/35 hover:text-[#2D241E] text-xs transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
