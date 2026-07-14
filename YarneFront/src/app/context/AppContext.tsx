import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  startTransition,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginWithGoogle,
  loginWithApple as apiLoginWithApple,
  logout as apiLogout,
  fetchAuthSession,
} from "../api/auth";
import { clearLegacyAuthStorage, tryRefreshSession } from "../api/client";
import { ApiRequestError } from "../api/errors";

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  subtitle?: string;
  price: number;
  color: string;
  colorHex: string;
  furnitureColor?: string;
  furnitureColorHex?: string;
  size: string;
  withLace?: boolean | null;
  quantity: number;
  image: string;
  maxQuantity: number;
}

interface WishlistContextType {
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "cartId">) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

interface OverlayContextType {
  cartOpen: boolean;
  loginOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  openLogin: () => void;
  closeLogin: () => void;
}

interface AuthContextType {
  isLoggedIn: boolean;
  authHydrated: boolean;
  user: { name: string; email: string; role: string } | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithOAuth: (idToken: string, provider: "google" | "apple") => Promise<{ ok: boolean; error?: string }>;
  register: (data: { firstName: string; lastName: string; userName: string; email: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

type AppContextType = CartContextType & OverlayContextType & AuthContextType & WishlistContextType;

const WishlistContext = createContext<WishlistContextType | null>(null);
const CartContext = createContext<CartContextType | null>(null);
const OverlayContext = createContext<OverlayContextType | null>(null);
const AuthContext = createContext<AuthContextType | null>(null);
const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const clearClientAuth = useCallback(() => {
    clearLegacyAuthStorage();
    setUser(null);
    setIsLoggedIn(false);
    setSessionExpiresAt(null);
  }, []);

  /** Clears httpOnly cookie via API, then local UI state. Used for explicit + soft logout. */
  const endSession = useCallback(() => {
    void apiLogout().catch(() => {
      /* cookie may already be gone */
    });
    clearClientAuth();
  }, [clearClientAuth]);

  const logout = endSession;

  useEffect(() => {
    clearLegacyAuthStorage();
    let cancelled = false;

    const hydrate = async () => {
      const delaysMs = [0, 500, 1200];
      for (let attempt = 0; attempt < delaysMs.length; attempt++) {
        if (delaysMs[attempt] > 0) {
          await new Promise((r) => setTimeout(r, delaysMs[attempt]));
        }
        if (cancelled) return;
        try {
          const session = await fetchAuthSession();
          if (cancelled) return;
          setUser({
            name: session.fullName || session.email,
            email: session.email,
            role: session.role ?? "Customer",
          });
          setSessionExpiresAt(session.expiresAt);
          setIsLoggedIn(true);
          setAuthHydrated(true);
          return;
        } catch (e) {
          if (cancelled) return;
          if (e instanceof ApiRequestError && e.status === 401) {
            // Access may be expired while refresh cookie is still valid.
            const refreshed = await tryRefreshSession();
            if (cancelled) return;
            if (refreshed) {
              try {
                const session = await fetchAuthSession();
                if (cancelled) return;
                setUser({
                  name: session.fullName || session.email,
                  email: session.email,
                  role: session.role ?? "Customer",
                });
                setSessionExpiresAt(session.expiresAt);
                setIsLoggedIn(true);
                setAuthHydrated(true);
                return;
              } catch {
                /* fall through to anonymous */
              }
            }
            clearClientAuth();
            setAuthHydrated(true);
            return;
          }
          // Network / 5xx — retry; on last attempt stay logged-out UI without assuming cookie is void.
          if (attempt === delaysMs.length - 1) {
            setAuthHydrated(true);
          }
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [clearClientAuth]);

  useEffect(() => {
    const onAuthExpired = () => endSession();
    window.addEventListener("auth-expired", onAuthExpired);
    return () => window.removeEventListener("auth-expired", onAuthExpired);
  }, [endSession]);

  useEffect(() => {
    if (!sessionExpiresAt) return;
    const refreshSkewMs = 120_000; // renew ~2 minutes before access JWT expires
    let busy = false;
    const checkExpiry = () => {
      const expires = new Date(sessionExpiresAt).getTime();
      if (Number.isNaN(expires) || busy) return;
      if (Date.now() < expires - refreshSkewMs) return;

      busy = true;
      void (async () => {
        try {
          const ok = await tryRefreshSession();
          if (!ok) {
            logout();
            return;
          }
          const session = await fetchAuthSession();
          setSessionExpiresAt(session.expiresAt);
        } catch {
          logout();
        } finally {
          busy = false;
        }
      })();
    };
    checkExpiry();
    const id = setInterval(checkExpiry, 60_000);
    return () => clearInterval(id);
  }, [sessionExpiresAt, logout]);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const openCart = useCallback(() => {
    startTransition(() => setCartOpen(true));
  }, []);

  const closeCart = useCallback(() => setCartOpen(false), []);
  const openLogin = useCallback(() => {
    startTransition(() => setLoginOpen(true));
  }, []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const addToCart = useCallback((item: Omit<CartItem, "cartId">) => {
    const maxQty = Math.max(0, item.maxQuantity);
    if (maxQty <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === item.productId &&
          i.color === item.color &&
          (i.furnitureColor ?? null) === (item.furnitureColor ?? null) &&
          i.size === item.size &&
          i.withLace === item.withLace
      );
      if (existing) {
        const nextQty = Math.min(existing.quantity + item.quantity, maxQty);
        if (nextQty <= existing.quantity) return prev;
        return prev.map((i) =>
          i.cartId === existing.cartId ? { ...i, quantity: nextQty, maxQuantity: maxQty } : i
        );
      }
      const quantity = Math.min(item.quantity, maxQty);
      return [
        ...prev,
        {
          ...item,
          quantity,
          maxQuantity: maxQty,
          cartId: `${item.productId}-${item.color}-${item.furnitureColor ?? "na"}-${item.size}-${item.withLace ?? "na"}-${Date.now()}`,
        },
      ];
    });
    startTransition(() => setCartOpen(true));
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } else {
      setCartItems((prev) =>
        prev.map((i) =>
          i.cartId === cartId
            ? { ...i, quantity: Math.min(qty, Math.max(1, i.maxQuantity)) }
            : i
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiLogin({ email, password });
      const role = res.role ?? "Customer";
      clearLegacyAuthStorage();
      setUser({ name: res.fullName, email: res.email, role });
      setSessionExpiresAt(res.expiresAt);
      setIsLoggedIn(true);
      setLoginOpen(false);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to connect to server. Is the backend running?";
      return { ok: false, error: msg };
    }
  }, []);

  const loginWithOAuth = useCallback(async (idToken: string, provider: "google" | "apple"): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = provider === "google" ? await apiLoginWithGoogle(idToken) : await apiLoginWithApple(idToken);
      const role = res.role ?? "Customer";
      clearLegacyAuthStorage();
      setUser({ name: res.fullName, email: res.email, role });
      setSessionExpiresAt(res.expiresAt);
      setIsLoggedIn(true);
      setLoginOpen(false);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OAuth sign-in failed. Please try again.";
      return { ok: false, error: msg };
    }
  }, []);

  const register = useCallback(async (data: { firstName: string; lastName: string; userName: string; email: string; password: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiRegister(data);
      const role = res.role ?? "Customer";
      clearLegacyAuthStorage();
      setUser({ name: res.fullName, email: res.email, role });
      setSessionExpiresAt(res.expiresAt);
      setIsLoggedIn(true);
      setLoginOpen(false);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to connect to server. Is the backend running?";
      return { ok: false, error: msg };
    }
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const wishlistValue = useMemo(() => ({ wishlist, toggleWishlist }), [wishlist, toggleWishlist]);

  const cartValue = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
    }),
    [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount]
  );

  const overlayValue = useMemo(
    () => ({ cartOpen, loginOpen, openCart, closeCart, openLogin, closeLogin }),
    [cartOpen, loginOpen, openCart, closeCart, openLogin, closeLogin]
  );

  const authValue = useMemo(
    () => ({
      isLoggedIn,
      authHydrated,
      user,
      isAdmin: user?.role === "Admin",
      login,
      loginWithOAuth,
      register,
      logout,
    }),
    [isLoggedIn, authHydrated, user, login, loginWithOAuth, register, logout]
  );

  const appValue = useMemo<AppContextType>(
    () => ({
      ...wishlistValue,
      ...cartValue,
      ...overlayValue,
      ...authValue,
    }),
    [wishlistValue, cartValue, overlayValue, authValue]
  );

  return (
    <WishlistContext.Provider value={wishlistValue}>
      <CartContext.Provider value={cartValue}>
        <OverlayContext.Provider value={overlayValue}>
          <AuthContext.Provider value={authValue}>
            <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
          </AuthContext.Provider>
        </OverlayContext.Provider>
      </CartContext.Provider>
    </WishlistContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within AppProvider");
  return ctx;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within AppProvider");
  return ctx;
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within AppProvider");
  return ctx;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AppProvider");
  return ctx;
}
