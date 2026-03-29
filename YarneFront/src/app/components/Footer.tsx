import { Link } from "react-router";
import { Instagram, Youtube } from "lucide-react";
const logoImg = "/logo.png";

export function Footer() {
  return (
    <footer
      className="mt-32 border-t border-[#2D241E]/10"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
        {/* Top: Logo + Tagline */}
        <div className="flex flex-col items-center text-center mb-16">
          <img src={logoImg} alt="Yarné" className="h-14 w-auto mb-4 opacity-80" />
          <p
            className="text-[#2D241E]/40 max-w-xs"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic" }}
          >
            Crafted slowly. Worn forever.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {[
            {
              title: "Shop",
              links: ["New Arrivals", "Sweaters", "Cardigans", "Vests", "Accessories"],
            },
            {
              title: "The Brand",
              links: ["Our Story", "Journal", "Craftsmanship", "Sustainability"],
            },
            {
              title: "Help",
              links: ["Size Guide", "Shipping & Returns", "Care Instructions", "Contact"],
            },
            {
              title: "Connect",
              links: ["Instagram", "Pinterest", "Stockists", "Newsletter"],
            },
          ].map((col) => (
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
            The Edit
          </p>
          <p
            className="text-[#2D241E]/50 text-sm mb-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            New arrivals, seasonal stories and early access — delivered to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
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
              <span className="uppercase tracking-widest">Subscribe</span>
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#2D241E]/8">
          <p
            className="text-[#2D241E]/35 text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            © {new Date().getFullYear()} Yarné — The Knit Gallery. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[#2D241E]/40 hover:text-[#4A0E0E] transition-colors">
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a href="#" className="text-[#2D241E]/40 hover:text-[#4A0E0E] transition-colors">
              <Youtube size={18} strokeWidth={1.5} />
            </a>
          </div>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Cookies"].map((item) => (
              <Link
                key={item}
                to="#"
                className="text-[#2D241E]/35 hover:text-[#2D241E] text-xs transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
