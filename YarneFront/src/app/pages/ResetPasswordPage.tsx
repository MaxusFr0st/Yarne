import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { LangLink } from "../i18n/LangLink";

const easing = [0.25, 0.1, 0.25, 1] as const;
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const INPUT =
  "w-full bg-white/70 border border-[#2D241E]/12 rounded-2xl px-4 py-3.5 pr-12 text-[#2D241E] placeholder-[#2D241E]/25 focus:outline-none focus:border-[#2D241E]/35 focus:ring-2 focus:ring-[#2D241E]/8 transition-[border-color,box-shadow] duration-200";
const BUTTON = "w-full py-3.5 rounded-full text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer";

type Step = "form" | "done" | "invalid";

function PasswordField({
  id,
  label,
  value,
  onChange,
  shown,
  onToggle,
  autoComplete,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  autoComplete: string;
  describedBy?: string;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[#2D241E]/[0.68] text-[0.72rem] uppercase tracking-[0.14em] mb-1.5"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={100}
          required
          aria-describedby={describedBy}
          className={INPUT}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[#2D241E]/40 hover:text-[#2D241E]/70 hover:bg-[#2D241E]/5 transition-colors cursor-pointer"
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { resetPassword, openForgotPassword } = useApp();
  const [searchParams] = useSearchParams();

  // The token is read once and then taken out of the address bar, so it doesn't stay in history or get shared by accident.
  // Plain history.replaceState: a router navigation here would remount the page and lose the token.
  const [token] = useState(() => searchParams.get("token") ?? "");
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  // A page with a secret in its link has no business in search results.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  const [step, setStep] = useState<Step>(token ? "form" : "invalid");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [shown, setShown] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (working) return;
    if (!PASSWORD_RULE.test(password)) {
      setError(t("passwordReset.ruleError"));
      return;
    }
    if (password !== repeat) {
      setError(t("passwordReset.mismatch"));
      return;
    }
    setError("");
    setWorking(true);
    const result = await resetPassword(token, password);
    setWorking(false);
    if (result.ok) {
      setPassword("");
      setRepeat("");
      setStep("done");
    } else if (result.reason === "invalid") {
      setStep("invalid");
    } else {
      setError(
        result.reason === "weak" ? t("passwordReset.ruleError") : result.reason === "tooMany" ? t("passwordReset.tooMany") : t("passwordReset.genericError")
      );
    }
  };

  const label = step === "form" ? t("passwordReset.pageLabel") : step === "done" ? t("passwordReset.doneLabel") : t("passwordReset.invalidLabel");
  const title = step === "form" ? t("passwordReset.pageTitle") : step === "done" ? t("passwordReset.doneTitle") : t("passwordReset.invalidTitle");

  return (
    <main
      className="min-h-[var(--app-svh)] flex items-center justify-center px-4 sm:px-6 pb-16"
      style={{ backgroundColor: "#F3EFE8", paddingTop: "120px" }}
    >
      <motion.div
        className="w-full max-w-md"
        style={{
          backgroundColor: "#F5F2ED",
          borderRadius: "clamp(28px, 6vw, 40px)",
          padding: "clamp(24px, 6vw, 48px)",
          boxShadow: "0 8px 32px rgba(45,36,30,0.08)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing }}
      >
        <div className="text-center mb-7">
          <p
            className="text-[#2D241E]/[0.68] tracking-widest uppercase text-xs mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
          >
            {label}
          </p>
          <h1
            className="text-[#2D241E]"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.65rem, 5vw, 2rem)", fontWeight: 400, lineHeight: 1.2 }}
          >
            {title}
          </h1>
        </div>

        {step === "form" && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <p
              id="reset-password-hint"
              className="text-[#2D241E]/[0.68] text-sm text-center leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {t("orderStatus.account.passwordHint")}
            </p>
            <PasswordField
              id="reset-password-new"
              label={t("passwordReset.newPasswordLabel")}
              value={password}
              onChange={setPassword}
              shown={shown}
              onToggle={() => setShown((v) => !v)}
              autoComplete="new-password"
              describedBy="reset-password-hint"
            />
            <PasswordField
              id="reset-password-repeat"
              label={t("passwordReset.repeatPasswordLabel")}
              value={repeat}
              onChange={setRepeat}
              shown={shown}
              onToggle={() => setShown((v) => !v)}
              autoComplete="new-password"
            />
            {error && (
              <p
                role="alert"
                aria-live="polite"
                className="text-[#4A0E0E] text-sm text-center px-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={working}
              className={`${BUTTON} mt-1`}
              style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", letterSpacing: "0.15em" }}
            >
              <span className="uppercase tracking-widest inline-block">{working ? t("passwordReset.saving") : t("passwordReset.submit")}</span>
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-6 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <p className="text-[#2D241E]/[0.68] text-sm leading-relaxed" role="status">
              {t("passwordReset.doneText")}
            </p>
            <LangLink
              to="/account"
              className={`${BUTTON} inline-block`}
              style={{ backgroundColor: "#2D241E", fontSize: "0.8rem", letterSpacing: "0.15em" }}
            >
              <span className="uppercase tracking-widest">{t("passwordReset.toAccount")}</span>
            </LangLink>
          </div>
        )}

        {step === "invalid" && (
          <div className="space-y-6 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <p className="text-[#2D241E]/[0.68] text-sm leading-relaxed">{t("passwordReset.invalidText")}</p>
            <button
              type="button"
              onClick={openForgotPassword}
              className={BUTTON}
              style={{ backgroundColor: "#2D241E", fontSize: "0.8rem", letterSpacing: "0.15em" }}
            >
              <span className="uppercase tracking-widest">{t("passwordReset.invalidAction")}</span>
            </button>
          </div>
        )}
      </motion.div>
    </main>
  );
}
