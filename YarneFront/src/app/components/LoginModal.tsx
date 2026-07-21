import { useCallback, useEffect, useId, useRef, useState, type Ref } from "react";
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "motion/react";
import { X, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverlay, useAuth } from "../context/AppContext";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { isGoogleOAuthEnabled, isOAuthEnabled } from "../config/oauth";
import { LoginGoogleButton } from "./LoginGoogleButton";

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
  const { t } = useTranslation();
  const { loginOpen, closeLogin } = useOverlay();
  const { login, loginWithOAuth, register } = useAuth();
  const reduceMotion = useReducedMotion();
  const touchMobile = useTouchMobileLayout();
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
    if (next === mode) return;
    setMode(next);
    setError("");
    setPassword("");
    setShowPass(false);
    if (!reduceMotion) {
      window.setTimeout(() => {
        (next === "register" ? firstNameRef : emailRef).current?.focus();
      }, 300);
    }
  }, [mode, reduceMotion]);

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

    const focusTimer = window.setTimeout(
      () => emailRef.current?.focus(),
      reduceMotion ? 0 : 180
    );

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [loginOpen, closeLogin, resetForm, reduceMotion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email.trim(), password);
        if (!result.ok) setError(result.error ?? t("auth.errors.invalidCredentials"));
      } else {
        const result = await register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          userName: userName.trim(),
          email: email.trim(),
          password,
        });
        if (!result.ok) setError(result.error ?? t("auth.errors.createAccountFailed"));
      }
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: easing };

  const expandTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const };

  const layoutTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] as const };

  const fieldStagger = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] as const };

  const registerFieldVariants = {
    hidden: { opacity: 0, y: -8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : { ...fieldStagger, delay: 0.04 + i * 0.045 },
    }),
    exit: {
      opacity: 0,
      y: -6,
      transition: reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  return (
    <AnimatePresence>
      {loginOpen && (
        <>
          <motion.button
            type="button"
            aria-label={t("auth.closeSignInDialog")}
            className="fixed inset-0 z-50 cursor-default"
            style={{
              backgroundColor: touchMobile ? "rgba(45,36,30,0.45)" : "rgba(45,36,30,0.38)",
              backdropFilter: touchMobile ? "none" : "blur(10px)",
            }}
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
                aria-label={t("auth.close")}
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
                  {t("auth.brandTagline")}
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={mode}
                    id={titleId}
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.65rem, 5vw, 2rem)", fontWeight: 400, lineHeight: 1.2 }}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={expandTransition}
                  >
                    {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
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
                    {tab === "login" ? t("auth.signInTab") : t("auth.registerTab")}
                  </button>
                ))}
              </div>

              {/* OAuth + form — layout morphs height; fields fade/slide (no height:auto jank) */}
              <LayoutGroup id="auth-form">
                <div className="relative">
                  <AnimatePresence initial={false}>
                    {mode === "login" && isOAuthEnabled && (
                      <motion.div
                        key="oauth-block"
                        layout="position"
                        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                        transition={{
                          opacity: expandTransition,
                          y: expandTransition,
                          layout: layoutTransition,
                        }}
                      >
                        <div className="mb-5 space-y-3">
                          {isGoogleOAuthEnabled && (
                            <LoginGoogleButton
                              loading={loading}
                              setLoading={setLoading}
                              setError={setError}
                              onToken={(token) => loginWithOAuth(token, "google")}
                            />
                          )}

                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex-1 h-px bg-[#2D241E]/10" />
                            <span className="text-xs text-[#2D241E]/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("auth.or")}</span>
                            <div className="flex-1 h-px bg-[#2D241E]/10" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.form
                    layout
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    noValidate
                    transition={layoutTransition}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {mode === "register" && (
                        <motion.div
                          key="register-fields"
                          layout="position"
                          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                          transition={{
                            opacity: expandTransition,
                            y: expandTransition,
                            layout: layoutTransition,
                          }}
                        >
                          <motion.div
                            className="space-y-4 pb-1"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                              visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.045, delayChildren: 0.03 } },
                              hidden: { transition: { staggerChildren: 0, staggerDirection: -1 } },
                            }}
                          >
                            <motion.div className="grid grid-cols-2 gap-3" variants={{ hidden: {}, visible: {} }}>
                              <motion.div variants={registerFieldVariants} custom={0}>
                                <AuthField
                                  id="auth-first-name"
                                  label={t("auth.firstName")}
                                  value={firstName}
                                  onChange={setFirstName}
                                  autoComplete="given-name"
                                  maxLength={80}
                                  required
                                  inputRef={firstNameRef}
                                />
                              </motion.div>
                              <motion.div variants={registerFieldVariants} custom={1}>
                                <AuthField
                                  id="auth-last-name"
                                  label={t("auth.lastName")}
                                  value={lastName}
                                  onChange={setLastName}
                                  autoComplete="family-name"
                                  maxLength={80}
                                  required
                                />
                              </motion.div>
                            </motion.div>
                            <motion.div variants={registerFieldVariants} custom={2}>
                              <AuthField
                                id="auth-username"
                                label={t("auth.username")}
                                value={userName}
                                onChange={setUserName}
                                autoComplete="username"
                                maxLength={50}
                                required
                              />
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div layout="position" transition={layoutTransition}>
                      <AuthField
                        id="auth-email"
                        label={t("auth.email")}
                        type="email"
                        value={email}
                        onChange={setEmail}
                        autoComplete="email"
                        maxLength={254}
                        required
                        inputRef={emailRef}
                      />
                    </motion.div>

                    <input
                      type="text"
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                      className="hidden"
                      aria-hidden="true"
                    />

                    <motion.div layout="position" transition={layoutTransition}>
                      <AuthField
                        id="auth-password"
                        label={t("auth.password")}
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
                          aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[#2D241E]/40 hover:text-[#2D241E]/70 hover:bg-[#2D241E]/5 transition-colors cursor-pointer"
                        >
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </AuthField>
                    </motion.div>

                    <AnimatePresence mode="wait" initial={false}>
                      {error && (
                        <motion.p
                          key={error}
                          layout="position"
                          role="alert"
                          aria-live="polite"
                          className="text-[#4A0E0E] text-sm text-center px-2"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                          transition={expandTransition}
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      layout="position"
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-full text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 mt-1 cursor-pointer"
                      style={{
                        backgroundColor: "#2D241E",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.8rem",
                        letterSpacing: "0.15em",
                      }}
                      transition={layoutTransition}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={mode}
                              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                            >
                              {mode === "login" ? t("auth.signingIn") : t("auth.creatingAccount")}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                      ) : (
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={mode}
                            className="uppercase tracking-widest inline-block"
                            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                            transition={{ duration: 0.22, ease: easing }}
                          >
                            {mode === "login" ? t("auth.signInAction") : t("auth.createAccountAction")}
                          </motion.span>
                        </AnimatePresence>
                      )}
                    </motion.button>
                  </motion.form>
                </div>
              </LayoutGroup>

              <p
                className="text-center text-[#2D241E]/40 text-xs mt-6 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {t("auth.agreePrefix")} {t("auth.terms")} {t("auth.and")} {t("auth.privacyPolicy")}.
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
