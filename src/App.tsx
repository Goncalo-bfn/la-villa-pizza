import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MenuProvider } from '@/context/MenuContext';
import { CartProvider } from '@/context/CartContext';
import { OrdersProvider } from '@/context/OrdersContext';
import { ToastProvider } from '@/context/ToastContext';
import { HomePage } from '@/pages/HomePage';
import { AdminPage } from '@/pages/AdminPage';

export default function App() {
  return (
    <MenuProvider>
      <CartProvider>
        <OrdersProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </OrdersProvider>
      </CartProvider>
    </MenuProvider>
  );
}
