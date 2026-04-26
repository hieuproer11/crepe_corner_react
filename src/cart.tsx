import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Produit } from './api';

export type CartItem = {
  produit: Produit;
  quantite: number;
};

type CartContextValue = {
  items: CartItem[];
  restaurantId: number | null;
  add: (produit: Produit) => void;
  remove: (produitId: number) => void;
  setQuantite: (produitId: number, quantite: number) => void;
  clear: () => void;
  totalCents: number;
  totalArticles: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);

  const add = (produit: Produit) => {
    // Si on change de restaurant, on vide le panier.
    setItems((prev) => {
      if (restaurantId !== null && restaurantId !== 1 /* placeholder */) {
        // pas applicable ici, on suit juste un seul restaurant pour l'instant
      }
      const existing = prev.find((i) => i.produit.id === produit.id);
      if (existing) {
        return prev.map((i) =>
          i.produit.id === produit.id ? { ...i, quantite: i.quantite + 1 } : i,
        );
      }
      return [...prev, { produit, quantite: 1 }];
    });
    setRestaurantId(1);
  };

  const remove = (produitId: number) => {
    setItems((prev) => prev.filter((i) => i.produit.id !== produitId));
  };

  const setQuantite = (produitId: number, quantite: number) => {
    if (quantite <= 0) return remove(produitId);
    setItems((prev) =>
      prev.map((i) => (i.produit.id === produitId ? { ...i, quantite } : i)),
    );
  };

  const clear = () => {
    setItems([]);
    setRestaurantId(null);
  };

  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.produit.prixCents * i.quantite, 0),
    [items],
  );
  const totalArticles = useMemo(
    () => items.reduce((sum, i) => sum + i.quantite, 0),
    [items],
  );

  const value: CartContextValue = {
    items,
    restaurantId,
    add,
    remove,
    setQuantite,
    clear,
    totalCents,
    totalArticles,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
