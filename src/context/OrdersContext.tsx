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
import { createId } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

interface OrdersContextValue {
  orders: Order[];
  create: (order: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>) => Order;
  setStatus: (id: string, status: OrderStatus) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() =>
    readStorage<Order[]>(STORAGE_KEYS.orders, []),
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.orders, orders);
  }, [orders]);

  const create = useCallback((input: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>) => {
    const currentOrders = readStorage<Order[]>(STORAGE_KEYS.orders, []);
    const nextNumber =
      (currentOrders.reduce((highest, order) => Math.max(highest, order.number), 0) || 0) + 1;
    const order: Order = {
      ...input,
      id: createId('order'),
      number: nextNumber,
      createdAt: new Date().toISOString(),
      status: 'novo',
    };
    setOrders((current) => [order, ...current]);
    return order;
  }, []);

  const setStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setOrders((current) => current.filter((order) => order.id !== id));
  }, []);

  const clear = useCallback(() => setOrders([]), []);

  const value = useMemo<OrdersContextValue>(
    () => ({ orders, create, setStatus, remove, clear }),
    [orders, create, setStatus, remove, clear],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders precisa ser usado dentro de OrdersProvider');
  return context;
}
