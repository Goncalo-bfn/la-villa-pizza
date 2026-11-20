import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '@/data/seed';
import { readStorage, writeStorage } from '@/lib/storage';
import { createId, getCartCount, getCartSubtotal, roundMoney } from '@/lib/utils';
import type { AddToCartInput, CartItem } from '@/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: AddToCartInput) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function flavorKey(flavors: CartItem['flavors']) {
  return flavors?.map((flavor) => flavor.productId).sort().join('|') ?? '';
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() =>
    readStorage<CartItem[]>(STORAGE_KEYS.cart, []),
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, items);
  }, [items]);

  const add = useCallback((input: AddToCartInput) => {
    setItems((current) => {
      const existing = current.find(
        (item) =>
          item.productId === input.productId &&
          flavorKey(item.flavors) === flavorKey(input.flavors) &&
          item.sizeId === input.sizeId &&
          item.bordaId === input.bordaId &&
          (item.note ?? '') === (input.note ?? '') &&
          item.unitPrice === input.unitPrice,
      );

      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...item, qty: item.qty + input.qty } : item,
        );
      }

      return [...current, { ...input, id: createId('item') }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((current) =>
      qty <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, qty } : item)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: getCartCount(items),
      subtotal: roundMoney(getCartSubtotal(items)),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart precisa ser usado dentro de CartProvider');
  return context;
}
