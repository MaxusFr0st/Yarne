import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product, ColorVariant } from "../data/products";

export interface CartItem {
  product: Product;
  variant: ColorVariant;
  size: string;
  quantity: number;
}

interface StoreContextType {
  cartItems: CartItem[];
  cartOpen: boolean;
  loginOpen: boolean;
  searchOpen: boolean;
  addToCart: (product: Product, variant: ColorVariant, size: string) => void;
  removeFromCart: (productId: string, variantId: string, size: string) => void;
  updateQuantity: (productId: string, variantId: string, size: string, quantity: number) => void;
  setCartOpen: (open: boolean) => void;
  setLoginOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  cartCount: number;
  cartTotal: number;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const addToCart = useCallback(
    (product: Product, variant: ColorVariant, size: string) => {
      setCartItems((prev) => {
        const existing = prev.find(
          (item) =>
            item.product.id === product.id &&
            item.variant.id === variant.id &&
            item.size === size
        );
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id &&
            item.variant.id === variant.id &&
            item.size === size
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { product, variant, size, quantity: 1 }];
      });
      setCartOpen(true);
    },
    []
  );

  const removeFromCart = useCallback(
    (productId: string, variantId: string, size: string) => {
      setCartItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.product.id === productId &&
              item.variant.id === variantId &&
              item.size === size
            )
        )
      );
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string, size: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId, variantId, size);
        return;
      }
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId &&
          item.variant.id === variantId &&
          item.size === size
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeFromCart]
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <StoreContext.Provider
      value={{
        cartItems,
        cartOpen,
        loginOpen,
        searchOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        setCartOpen,
        setLoginOpen,
        setSearchOpen,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
