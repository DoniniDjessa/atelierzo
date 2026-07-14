"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useUser } from "./UserContext";
import { useProducts } from "./ProductContext";
import { toast } from "sonner";
import {
  allocatePromoLineTotals,
  cartItemKey,
  getPromoTotal,
  getPromoSavings,
  hasPromoPricing,
} from "@/app/lib/utils/promo-pricing";


export interface CartItem {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  size: string;
  color?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (productId: string, size: string, color?: string) => void;
  updateQuantity: (
    productId: string,
    size: string,
    quantity: number,
    color?: string
  ) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  /** Line total after multi-buy promo (same product across sizes/colors). */
  getLineTotal: (item: CartItem) => number;
  getLineSavings: (item: CartItem) => number;
  getProductQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { getProductById } = useProducts();
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage when user changes or on initial mount
  useEffect(() => {
    if (user?.phone) {
      const storedCart = localStorage.getItem(`atelierzo_cart_${user.phone}`);
      if (storedCart) {
        try {
          setItems(JSON.parse(storedCart));
        } catch (e) {
          console.error("Error parsing stored cart:", e);
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } else {
      setItems([]); // Clear cart if no user is logged in
    }
  }, [user?.phone]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (user?.phone) {
      if (items.length > 0) {
        localStorage.setItem(
          `atelierzo_cart_${user.phone}`,
          JSON.stringify(items)
        );
      } else {
        localStorage.removeItem(`atelierzo_cart_${user.phone}`);
      }
    }
  }, [items, user?.phone]);

  const addToCart = (
    item: Omit<CartItem, "quantity"> & { quantity?: number }
  ) => {
    const qtyToAdd = item.quantity || 1;

    // Check stock availability before adding
    const product = getProductById(item.productId);
    if (product && product.sizeQuantities) {
      const availableQty = product.sizeQuantities[item.size] || 0;

      // Check if item already exists to calculate total quantity
      const existingItem = items.find(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color
      );
      const currentQtyInCart = existingItem ? existingItem.quantity : 0;
      const totalQty = currentQtyInCart + qtyToAdd;

      if (totalQty > availableQty) {
        toast.error(
          `Stock insuffisant ! Il ne reste que ${availableQty} article(s) en stock pour la taille ${item.size}.`
        );
        return;
      }
    }

    setItems((prevItems) => {
      // Check if item already exists (same productId, size, and color)
      const existingIndex = prevItems.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color
      );

      if (existingIndex >= 0) {
        // Update quantity if item exists
        const updated = [...prevItems];
        updated[existingIndex].quantity += qtyToAdd;
        return updated;
      } else {
        // Add new item with quantity
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { quantity, ...itemWithoutQty } = item;
        return [...prevItems, { ...itemWithoutQty, quantity: qtyToAdd }];
      }
    });
  };

  const removeFromCart = (productId: string, size: string, color?: string) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.size === size &&
            item.color === color
          )
      )
    );
  };

  const updateQuantity = (
    productId: string,
    size: string,
    quantity: number,
    color?: string
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    // Check stock availability before updating
    const product = getProductById(productId);
    if (product && product.sizeQuantities) {
      const availableQty = product.sizeQuantities[size] || 0;

      if (quantity > availableQty) {
        toast.error(
          `Stock insuffisant ! Il ne reste que ${availableQty} article(s) en stock pour la taille ${size}.`
        );
        // Set to maximum available quantity instead of rejecting
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.productId === productId &&
            item.size === size &&
            item.color === color
              ? { ...item, quantity: availableQty }
              : item
          )
        );
        return;
      }
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId &&
        item.size === size &&
        item.color === color
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getProductQuantity = (productId: string) => {
    return items
      .filter((item) => item.productId === productId)
      .reduce((count, item) => count + item.quantity, 0);
  };

  const getLineTotalsMap = () => {
    const byProduct = new Map<string, CartItem[]>();
    for (const item of items) {
      const group = byProduct.get(item.productId) || [];
      group.push(item);
      byProduct.set(item.productId, group);
    }

    const totals: Record<string, number> = {};
    for (const group of byProduct.values()) {
      const unitPrice = group[0].price;
      const lines = group.map((item) => ({
        key: cartItemKey(item.productId, item.size, item.color),
        quantity: item.quantity,
      }));
      Object.assign(totals, allocatePromoLineTotals(lines, unitPrice));
    }
    return totals;
  };

  const getLineTotal = (item: CartItem) => {
    const key = cartItemKey(item.productId, item.size, item.color);
    const map = getLineTotalsMap();
    if (key in map) return map[key];
    return getPromoTotal(item.price, item.quantity);
  };

  const getLineSavings = (item: CartItem) => {
    if (!hasPromoPricing(item.price)) return 0;
    const productQty = getProductQuantity(item.productId);
    const productSavings = getPromoSavings(item.price, productQty);
    if (productSavings <= 0 || productQty <= 0) return 0;
    return Math.round((item.quantity / productQty) * productSavings);
  };

  const getTotal = () => {
    const byProduct = new Map<string, { price: number; quantity: number }>();
    for (const item of items) {
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        byProduct.set(item.productId, {
          price: item.price,
          quantity: item.quantity,
        });
      }
    }

    let total = 0;
    for (const { price, quantity } of byProduct.values()) {
      total += getPromoTotal(price, quantity);
    }
    return total;
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        getLineTotal,
        getLineSavings,
        getProductQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
