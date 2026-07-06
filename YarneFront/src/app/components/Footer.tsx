import { Link } from "react-router";
import { Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";

const INSTAGRAM_URL = "https://www.instagram.com/yarne.acc/";
const TIKTOK_URL = "https://www.tiktok.com/@yarne.acc";

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

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

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#2D241E]/8">
          <p
            className="text-[#2D241E]/35 text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2D241E]/40 hover:text-[#4A0E0E] transition-colors cursor-pointer"
              aria-label="Instagram"
            >
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2D241E]/40 hover:text-[#4A0E0E] transition-colors cursor-pointer"
              aria-label="TikTok"
            >
              <TikTokIcon size={18} />
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
