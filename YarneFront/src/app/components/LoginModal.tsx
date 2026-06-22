import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useApp } from "../context/AppContext";

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

export function LoginModal() {
  const { loginOpen, closeLogin, login, loginWithOAuth, register } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (!result.ok) setError(result.error ?? "Invalid email or password. Please try again.");
      } else {
        const result = await register({ firstName, lastName, userName, email, password });
        if (!result.ok) setError(result.error ?? "Email or username already registered. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const result = await loginWithOAuth(tokenResponse.access_token, "google");
        if (!result.ok) setError(result.error ?? "Google sign-in failed. Please try again.");
      } catch {
        setError("Google sign-in failed. Check that the backend is running.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
      setLoading(false);
    },
    scope: "openid email profile",
  });

  const handleAppleLogin = async () => {
    if (!window.AppleID) {
      setError("Apple Sign In is not available. Please try again later.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      window.AppleID.auth.init({
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID ?? "",
        scope: "name email",
        redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI ?? window.location.origin,
        usePopup: true,
      });
      const data = await window.AppleID.auth.signIn();
      const result = await loginWithOAuth(data.authorization.id_token, "apple");
      if (!result.ok) setError(result.error ?? "Apple sign-in failed. Please try again.");
    } catch {
      setError("Apple sign-in was cancelled or failed.");
    }
    setLoading(false);
  };

  const inputClass =
    "w-full bg-white/60 border border-[#2D241E]/15 rounded-2xl px-5 py-4 text-[#2D241E] placeholder-[#2D241E]/30 focus:outline-none focus:border-[#2D241E]/40 transition-colors duration-300";

  return (
    <AnimatePresence>
      {loginOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(45,36,30,0.35)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLogin}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md relative"
              style={{
                backgroundColor: "#F5F2ED",
                borderRadius: "40px",
                padding: "48px 48px",
                boxShadow: "0 40px 120px rgba(45,36,30,0.18), 0 8px 32px rgba(45,36,30,0.08)",
              }}
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={closeLogin}
                className="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center text-[#2D241E]/40 hover:text-[#2D241E] hover:bg-[#2D241E]/8 transition-all"
              >
                <X size={16} />
              </button>

              {/* Heading */}
              <div className="text-center mb-8">
                <img src="/logo.png" alt="Yarné" className="mx-auto mb-6 h-16 w-16 object-contain" />
                <p
                  className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-3"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
                >
                  The Knit Gallery
                </p>
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 400, lineHeight: 1.2 }}
                >
                  {mode === "login" ? "Welcome back" : "Create account"}
                </h2>
              </div>

              {/* Tabs */}
              <div className="flex rounded-full p-1 mb-8" style={{ backgroundColor: "#EDE9E2" }}>
                {(["login", "register"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setMode(tab); setError(""); }}
                    className="flex-1 py-2.5 rounded-full text-sm transition-all duration-300 capitalize"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "0.06em",
                      backgroundColor: mode === tab ? "#2D241E" : "transparent",
                      color: mode === tab ? "#F5F2ED" : "#2D241E",
                      boxShadow: mode === tab ? "0 2px 12px rgba(45,36,30,0.2)" : "none",
                    }}
                  >
                    {tab === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {mode === "login" && (
                <div className="mb-4 space-y-3">
                  {/* Google */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => { setError(""); googleLogin(); }}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full border border-[#2D241E]/12 bg-white hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "#3c3c3c" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                    </svg>
                    Continue with Google
                  </button>

                  {/* Apple */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleAppleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full transition-colors duration-200 disabled:opacity-50"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", backgroundColor: "#000", color: "#fff" }}
                  >
                    <svg width="16" height="19" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-109.2c-52.5-73.5-96-191.9-96-304.5 0-151 103.7-230.3 205.3-230.3 64.1 0 117.6 42.5 157.9 42.5 38.1 0 97.5-44.9 164-44.9 26.5 0 108.2 2.6 168.6 81.3zm-201.8-176.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                    </svg>
                    Continue with Apple
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px" style={{ backgroundColor: "#2D241E", opacity: 0.1 }} />
                    <span className="text-xs text-[#2D241E]/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>or</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "#2D241E", opacity: 0.1 }} />
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence>
                  {mode === "register" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className={inputClass}
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className={inputClass}
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Username"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                        className={inputClass}
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />

                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass + " pr-12"}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2D241E]/40 hover:text-[#2D241E]/70 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <p className="text-[#4A0E0E] text-sm text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {error}
                  </p>
                )}

                {mode === "login" && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-[#2D241E]/50 text-xs hover:text-[#4A0E0E] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full text-white transition-all duration-300 hover:opacity-90 disabled:opacity-50 mt-2"
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
                      {mode === "login" ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : (
                    <span className="uppercase tracking-widest">
                      {mode === "login" ? "Sign In" : "Create Account"}
                    </span>
                  )}
                </button>
              </form>

              <p
                className="text-center text-[#2D241E]/40 text-xs mt-6"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                By continuing, you agree to our{" "}
                <button className="underline hover:text-[#2D241E] transition-colors">Terms</button>{" "}
                &{" "}
                <button className="underline hover:text-[#2D241E] transition-colors">Privacy Policy</button>
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
