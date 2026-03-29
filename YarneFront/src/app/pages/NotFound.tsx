import { Link } from "react-router";
import { motion } from "motion/react";

export function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <p
          className="text-[#2D241E]/25 mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "7rem", fontWeight: 300, lineHeight: 1 }}
        >
          404
        </p>
        <h1
          className="text-[#2D241E] mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 400 }}
        >
          Page not found
        </h1>
        <p
          className="text-[#2D241E]/50 mb-10 max-w-sm"
          style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}
        >
          The page you're looking for has moved, or perhaps it was never here to begin with.
        </p>
        <Link
          to="/"
          className="px-10 py-4 rounded-full text-white transition-all duration-300 hover:opacity-90 inline-block"
          style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em" }}
        >
          <span className="uppercase tracking-widest">Return Home</span>
        </Link>
      </motion.div>
    </main>
  );
}
