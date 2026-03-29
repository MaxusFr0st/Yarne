import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, register as apiRegister } from "../api/auth";

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  price: number;
  color: string;
  colorHex: string;
  size: string;
  quantity: number;
  image: string;
}

interface AppContextType {
  // Cart
  cartItems: CartItem[];
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: Omit<CartItem, "cartId">) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, qty: number) => void;
  cartTotal: number;
  cartCount: number;

  // Auth
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  isLoggedIn: boolean;
  user: { name: string; email: string; role: string } | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: { firstName: string; lastName: string; userName: string; email: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");
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

  // Check token expiry every 60s - JWT expires after 15 mins, user must re-login
  useEffect(() => {
    const checkExpiry = () => {
      const userData = localStorage.getItem("auth_user");
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
    checkExpiry(); // Run immediately on mount
    const id = setInterval(checkExpiry, 60000);
    return () => clearInterval(id);
  }, [logout]);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const addToCart = useCallback((item: Omit<CartItem, "cartId">) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === item.productId && i.color === item.color && i.size === item.size
      );
      if (existing) {
        return prev.map((i) =>
          i.cartId === existing.cartId ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, cartId: `${item.productId}-${item.color}-${item.size}-${Date.now()}` }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } else {
      setCartItems((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i)));
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiLogin({ email, password });
      const role = res.role ?? "Customer";
      const userPayload = { email: res.email, fullName: res.fullName, userName: res.userName, role, expiresAt: res.expiresAt };
      localStorage.setItem("auth_token", res.token);
      localStorage.setItem("auth_user", JSON.stringify(userPayload));
      setUser({ name: res.fullName, email: res.email, role });
      setIsLoggedIn(true);
      setLoginOpen(false);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to connect to server. Is the backend running?";
      return { ok: false, error: msg };
    }
  }, []);

  const register = useCallback(async (data: { firstName: string; lastName: string; userName: string; email: string; password: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiRegister(data);
      const role = res.role ?? "Customer";
      const userPayload = { email: res.email, fullName: res.fullName, userName: res.userName, role, expiresAt: res.expiresAt };
      localStorage.setItem("auth_token", res.token);
      localStorage.setItem("auth_user", JSON.stringify(userPayload));
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

  return (
    <AppContext.Provider
      value={{
        cartItems,
        cartOpen,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        cartTotal,
        cartCount,
        loginOpen,
        openLogin,
        closeLogin,
        isLoggedIn,
        user,
        isAdmin: user?.role === "Admin",
        login,
        register,
        logout,
        wishlist,
        toggleWishlist,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
