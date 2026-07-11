import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { LangLink } from "../i18n/LangLink";
import { useLocale, withLocale } from "../i18n/useLocale";
import { fetchCollections, type CollectionDto } from "../api/collections";

const INSTAGRAM_URL = "https://www.instagram.com/yarne.acc/";
const TIKTOK_URL = "https://www.tiktok.com/@yarne.acc";

const CONNECT_LINKS = [
  { key: "instagram", href: INSTAGRAM_URL },
  { key: "tiktok", href: TIKTOK_URL },
] as const;

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

const linkClassName =
  "text-[#2D241E]/55 hover:text-[#4A0E0E] transition-colors duration-300 text-sm";

export function Footer() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [collections, setCollections] = useState<CollectionDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchCollections()
      .then((data) => {
        if (!cancelled) setCollections(data);
      })
      .catch(() => {
        // Footer still renders without dynamic collections
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shopLinks = [
    { label: t("footer.links.newArrivals"), to: "/collection?filter=new" },
    ...collections.map((collection) => ({
      label: collection.name,
      to: `/collection?collection=${collection.id}`,
    })),
    { label: t("footer.links.allPieces"), to: "/collection" },
  ];

  const brandLinks = [
    { label: t("footer.links.ourHistory"), to: "/pages/our-history" },
  ];

  const helpLinks = [
    { label: t("footer.links.delivery"), to: "/pages/delivery" },
    { label: t("footer.links.care"), to: "/pages/care" },
    { label: t("footer.legal.terms"), to: "/pages/terms" },
    { label: t("footer.links.contact"), href: "mailto:hello@yarne.acc" },
  ];

  const columns = [
    { id: "shop", title: t("footer.columns.shop.title"), links: shopLinks },
    { id: "brand", title: t("footer.columns.brand.title"), links: brandLinks },
    { id: "help", title: t("footer.columns.help.title"), links: helpLinks },
    { id: "connect", title: t("footer.columns.connect.title") },
  ] as const;

  return (
    <footer
      className="mt-32 border-t border-[#2D241E]/10"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="flex flex-col items-center text-center mb-16">
          <Logo title="Yarné" className="h-10 w-auto mb-4 text-[#2D241E] opacity-80" />
          <p
            className="text-[#2D241E]/40 max-w-xs"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic" }}
          >
            {t("footer.tagline")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {columns.map((col) => (
            <div key={col.id}>
              <p
                className="text-[#2D241E] mb-5 tracking-widest uppercase text-xs"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
              >
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.id === "connect"
                  ? CONNECT_LINKS.map((link) => (
                      <li key={link.key}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClassName}
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {t(`footer.columns.connect.${link.key}`)}
                        </a>
                      </li>
                    ))
                  : col.links.map((link) => (
                      <li key={link.label}>
                        {"href" in link ? (
                          <a
                            href={link.href}
                            className={linkClassName}
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            to={withLocale(link.to, locale)}
                            className={linkClassName}
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
              </ul>
            </div>
          ))}
        </div>

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
        </div>
      </div>
    </footer>
  );
}
