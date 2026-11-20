import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MenuProvider } from '@/context/MenuContext';
import { CartProvider } from '@/context/CartContext';
import { OrdersProvider } from '@/context/OrdersContext';
import { ToastProvider } from '@/context/ToastContext';
import { HomePage } from '@/pages/HomePage';

const AdminPage = lazy(() =>
  import('@/pages/AdminPage').then((module) => ({ default: module.AdminPage })),
);

export default function App() {
  return (
    <MenuProvider>
      <CartProvider>
        <OrdersProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                  path="/admin"
                  element={
                    <Suspense
                      fallback={
                        <div
                          role="status"
                          className="grid min-h-screen place-items-center text-sm text-muted-foreground"
                        >
                          Carregando painel...
                        </div>
                      }
                    >
                      <AdminPage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </OrdersProvider>
      </CartProvider>
    </MenuProvider>
  );
}
