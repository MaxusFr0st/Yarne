import { useCallback, useEffect, useId, useRef, useState, type Ref } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Eye, EyeOff } from "lucide-react";
import { useApp } from "../context/AppContext";
import { appleClientId, appleRedirectUri, isAppleOAuthEnabled, isGoogleOAuthEnabled, isOAuthEnabled } from "../config/oauth";
import { LoginGoogleButton } from "./LoginGoogleButton";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: object) => void;
        signIn: () => Promise<{ authorization: { id_token: string } }>;
      };
    };
  }
}

const easing = [0.25, 0.1, 0.25, 1] as const;

type AuthMode = "login" | "register";

function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  maxLength,
  required,
  className = "",
  inputRef,
  children,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[#2D241E]/55 text-[11px] uppercase tracking-[0.14em] mb-1.5"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={maxLength}
          required={required}
          className={`w-full bg-white/70 border border-[#2D241E]/12 rounded-2xl px-4 py-3.5 text-[#2D241E] placeholder-[#2D241E]/25 focus:outline-none focus:border-[#2D241E]/35 focus:ring-2 focus:ring-[#2D241E]/8 transition-[border-color,box-shadow] duration-200${children ? " pr-12" : ""}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
        {children}
      </div>
    </div>
  );
}

export function LoginModal() {
  const { loginOpen, closeLogin, login, loginWithOAuth, register } = useApp();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setUserName("");
    setShowPass(false);
    setError("");
    setLoading(false);
    setMode("login");
  }, []);

  const switchMode = useCallback((next: AuthMode) => {
    setMode(next);
    setError("");
    setPassword("");
    setShowPass(false);
  }, []);

  useEffect(() => {
    if (!loginOpen) {
      resetForm();
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLogin();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget = mode === "login" ? emailRef.current : firstNameRef.current;
    const focusTimer = window.setTimeout(() => focusTarget?.focus(), reduceMotion ? 0 : 120);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [loginOpen, closeLogin, resetForm, reduceMotion, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email.trim(), password);
        if (!result.ok) setError(result.error ?? "Invalid email or password. Please try again.");
      } else {
        const result = await register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          userName: userName.trim(),
          email: email.trim(),
          password,
        });
        if (!result.ok) setError(result.error ?? "Could not create account. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!isAppleOAuthEnabled) {
      setError("Apple Sign In is not configured.");
      return;
    }
    if (!window.AppleID) {
      setError("Apple Sign In is not available. Please try again later.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: "name email",
        redirectURI: appleRedirectUri || window.location.origin,
        usePopup: true,
      });
      const data = await window.AppleID.auth.signIn();
      const result = await loginWithOAuth(data.authorization.id_token, "apple");
      if (!result.ok) setError(result.error ?? "Apple sign-in failed. Please try again.");
    } catch {
      setError("Apple sign-in was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: easing };

  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: easing };

  return (
    <AnimatePresence>
      {loginOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close sign in dialog"
            className="fixed inset-0 z-50 cursor-default"
            style={{ backgroundColor: "rgba(45,36,30,0.38)", backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            onClick={closeLogin}
          />

          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            role="presentation"
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-md relative pointer-events-auto"
              style={{
                backgroundColor: "#F5F2ED",
                borderRadius: "clamp(28px, 6vw, 40px)",
                padding: "clamp(28px, 6vw, 48px)",
                boxShadow: "0 40px 120px rgba(45,36,30,0.18), 0 8px 32px rgba(45,36,30,0.08)",
              }}
              initial={reduceMotion ? false : { scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { scale: 0.96, opacity: 0, y: 16 }}
              transition={panelTransition}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeLogin}
                aria-label="Close"
                className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#2D241E]/40 hover:text-[#2D241E] hover:bg-[#2D241E]/8 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="text-center mb-7">
                <img src="/logo.png" alt="Yarné" className="mx-auto mb-5 h-14 w-14 object-contain" />
                <p
                  className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
                >
                  The Knit Gallery
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={mode}
                    id={titleId}
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.65rem, 5vw, 2rem)", fontWeight: 400, lineHeight: 1.2 }}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={contentTransition}
                  >
                    {mode === "login" ? "Welcome back" : "Create account"}
                  </motion.h2>
                </AnimatePresence>
              </div>

              {/* Tab switcher with sliding pill */}
              <div className="relative flex rounded-full p-1 mb-7" style={{ backgroundColor: "#EDE9E2" }}>
                {!reduceMotion && (
                  <motion.div
                    className="absolute top-1 bottom-1 rounded-full"
                    style={{
                      backgroundColor: "#2D241E",
                      boxShadow: "0 2px 12px rgba(45,36,30,0.2)",
                      width: "calc(50% - 4px)",
                    }}
                    animate={{ left: mode === "login" ? "4px" : "calc(50%)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {(["login", "register"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => switchMode(tab)}
                    className="relative z-10 flex-1 py-2.5 rounded-full text-sm transition-colors duration-200 cursor-pointer"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "0.06em",
                      color: mode === tab ? "#F5F2ED" : "#2D241E",
                      backgroundColor: reduceMotion && mode === tab ? "#2D241E" : "transparent",
                    }}
                    aria-pressed={mode === tab}
                  >
                    {tab === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={reduceMotion ? false : { opacity: 0, x: mode === "login" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: mode === "login" ? 10 : -10 }}
                  transition={contentTransition}
                >
                  {mode === "login" && isOAuthEnabled && (
                    <div className="mb-5 space-y-3">
                      {isGoogleOAuthEnabled && (
                        <LoginGoogleButton
                          loading={loading}
                          setLoading={setLoading}
                          setError={setError}
                          onToken={(token) => loginWithOAuth(token, "google")}
                        />
                      )}

                      {isAppleOAuthEnabled && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={handleAppleLogin}
                          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", backgroundColor: "#000", color: "#fff" }}
                        >
                          <svg width="16" height="19" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
                            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-109.2c-52.5-73.5-96-191.9-96-304.5 0-151 103.7-230.3 205.3-230.3 64.1 0 117.6 42.5 157.9 42.5 38.1 0 97.5-44.9 164-44.9 26.5 0 108.2 2.6 168.6 81.3zm-201.8-176.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
                          </svg>
                          Continue with Apple
                        </button>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-[#2D241E]/10" />
                        <span className="text-xs text-[#2D241E]/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>or</span>
                        <div className="flex-1 h-px bg-[#2D241E]/10" />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {mode === "register" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <AuthField
                            id="auth-first-name"
                            label="First name"
                            value={firstName}
                            onChange={setFirstName}
                            autoComplete="given-name"
                            maxLength={80}
                            required
                            inputRef={firstNameRef}
                          />
                          <AuthField
                            id="auth-last-name"
                            label="Last name"
                            value={lastName}
                            onChange={setLastName}
                            autoComplete="family-name"
                            maxLength={80}
                            required
                          />
                        </div>
                        <AuthField
                          id="auth-username"
                          label="Username"
                          value={userName}
                          onChange={setUserName}
                          autoComplete="username"
                          maxLength={50}
                          required
                        />
                      </div>
                    )}

                    <AuthField
                      id="auth-email"
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      autoComplete="email"
                      maxLength={254}
                      required
                      inputRef={emailRef}
                    />
                    {/* Honeypot — bots only */}
                    <input
                      type="text"
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                      className="hidden"
                      aria-hidden="true"
                    />

                    <AuthField
                      id="auth-password"
                      label="Password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      maxLength={128}
                      required
                    >
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={showPass ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[#2D241E]/40 hover:text-[#2D241E]/70 hover:bg-[#2D241E]/5 transition-colors cursor-pointer"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </AuthField>

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
                      disabled={loading}
                      className="w-full py-3.5 rounded-full text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 mt-1 cursor-pointer"
                      style={{
                        backgroundColor: "#2D241E",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.8rem",
                        letterSpacing: "0.15em",
                      }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {mode === "login" ? "Signing in…" : "Creating account…"}
                        </span>
                      ) : (
                        <span className="uppercase tracking-widest">
                          {mode === "login" ? "Sign In" : "Create Account"}
                        </span>
                      )}
                    </button>
                  </form>
                </motion.div>
              </AnimatePresence>

              <p
                className="text-center text-[#2D241E]/40 text-xs mt-6 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                By continuing, you agree to our Terms & Privacy Policy.
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
