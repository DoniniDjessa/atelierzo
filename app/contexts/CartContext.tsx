'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './UserContext';

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
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage when user changes or on initial mount
  useEffect(() => {
    if (user?.phone) {
      const storedCart = localStorage.getItem(`atelierzo_cart_${user.phone}`);
      if (storedCart) {
        try {
          setItems(JSON.parse(storedCart));
        } catch (e) {
          console.error('Error parsing stored cart:', e);
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
        localStorage.setItem(`atelierzo_cart_${user.phone}`, JSON.stringify(items));
      } else {
        localStorage.removeItem(`atelierzo_cart_${user.phone}`);
      }
    }
  }, [items, user?.phone]);

  const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qtyToAdd = item.quantity || 1;
    setItems((prevItems) => {
      // Check if item already exists (same productId, size, and color)
      const existingIndex = prevItems.findIndex(
        (i) => i.productId === item.productId && i.size === item.size && i.color === item.color
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
        (item) => !(item.productId === productId && item.size === size && item.color === color)
      )
    );
  };

  const updateQuantity = (productId: string, size: string, quantity: number, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

