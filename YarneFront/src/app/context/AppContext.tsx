import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  startTransition,
} from "react";
import { login as apiLogin, register as apiRegister, loginWithGoogle as apiLoginWithGoogle, loginWithApple as apiLoginWithApple } from "../api/auth";

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  subtitle?: string;
  price: number;
  color: string;
  colorHex: string;
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

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

function readSessionAuth() {
  return {
    token: sessionStorage.getItem(AUTH_TOKEN_KEY),
    user: sessionStorage.getItem(AUTH_USER_KEY),
  };
}

function migrateLegacyLocalAuthIfNeeded() {
  const hasSessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const hasSessionUser = sessionStorage.getItem(AUTH_USER_KEY);
  if (hasSessionToken || hasSessionUser) return;

  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const legacyUser = localStorage.getItem(AUTH_USER_KEY);
  if (legacyToken) sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
  if (legacyUser) sessionStorage.setItem(AUTH_USER_KEY, legacyUser);
  if (legacyToken || legacyUser) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

function writeSessionAuth(token: string, user: string) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, user);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function clearAuthStorage() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  useEffect(() => {
    migrateLegacyLocalAuthIfNeeded();
    const { token, user: userData } = readSessionAuth();
    if (token && userData) {
      try {
        const u = JSON.parse(userData);
        setUser({ name: u.fullName || u.email, email: u.email, role: u.role ?? "Customer" });
        setIsLoggedIn(true);
      } catch {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    const onAuthExpired = () => logout();
    window.addEventListener("auth-expired", onAuthExpired);
    return () => window.removeEventListener("auth-expired", onAuthExpired);
  }, [logout]);

  useEffect(() => {
    const checkExpiry = () => {
      const userData = sessionStorage.getItem(AUTH_USER_KEY);
      if (!userData) return;
      try {
        const u = JSON.parse(userData);
        if (u.expiresAt && new Date(u.expiresAt) <= new Date()) {
          logout();
        }
      } catch {
        logout();
      }
    };
    checkExpiry();
    const id = setInterval(checkExpiry, 60000);
    return () => clearInterval(id);
  }, [logout]);

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
          cartId: `${item.productId}-${item.color}-${item.size}-${item.withLace ?? "na"}-${Date.now()}`,
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
      const userPayload = { email: res.email, fullName: res.fullName, userName: res.userName, role, expiresAt: res.expiresAt };
      writeSessionAuth(res.token, JSON.stringify(userPayload));
      setUser({ name: res.fullName, email: res.email, role });
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
      const userPayload = { email: res.email, fullName: res.fullName, userName: res.userName, role, expiresAt: res.expiresAt };
      writeSessionAuth(res.token, JSON.stringify(userPayload));
      setUser({ name: res.fullName, email: res.email, role });
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
      const userPayload = { email: res.email, fullName: res.fullName, userName: res.userName, role, expiresAt: res.expiresAt };
      writeSessionAuth(res.token, JSON.stringify(userPayload));
      setUser({ name: res.fullName, email: res.email, role });
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
      user,
      isAdmin: user?.role === "Admin",
      login,
      loginWithOAuth,
      register,
      logout,
    }),
    [isLoggedIn, user, login, loginWithOAuth, register, logout]
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
