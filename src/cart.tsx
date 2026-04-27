import React, { createContext, useContext, useMemo, useState } from 'react';
import type { MenuItem } from './api';
import { priceToCents } from './api';

export type CartItem = {
  menuItem: MenuItem;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  restaurantId: number | null;
  add: (menuItem: MenuItem, restaurantId: number) => void;
  remove: (menuItemId: number) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  clear: () => void;
  totalCents: number;
  totalItems: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);

  const add = (menuItem: MenuItem, rid: number) => {
    // If switching restaurant, clear cart first.
    setItems((prev) => {
      const base = restaurantId !== null && restaurantId !== rid ? [] : prev;
      const existing = base.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        return base.map((i) =>
          i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...base, { menuItem, quantity: 1 }];
    });
    setRestaurantId(rid);
  };

  const remove = (menuItemId: number) => {
    setItems((prev) => prev.filter((i) => i.menuItem.id !== menuItemId));
  };

  const setQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) return remove(menuItemId);
    setItems((prev) =>
      prev.map((i) => (i.menuItem.id === menuItemId ? { ...i, quantity } : i)),
    );
  };

  const clear = () => {
    setItems([]);
    setRestaurantId(null);
  };

  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + priceToCents(i.menuItem.price) * i.quantity, 0),
    [items],
  );

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const value: CartContextValue = {
    items,
    restaurantId,
    add,
    remove,
    setQuantity,
    clear,
    totalCents,
    totalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
