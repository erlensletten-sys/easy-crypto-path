import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { CartProvider } from "./contexts/CartContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PgpSetup from "./pages/PgpSetup";
import ProductsManagement from "./pages/ProductsManagement";
import ProductsBrowse from "./pages/ProductsBrowse";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import WalletManagement from "./pages/WalletManagement";
import OrdersOverview from "./pages/OrdersOverview";
import MyOrders from "./pages/MyOrders";
import NotFound from "./pages/NotFound";
import { apiClient } from "./lib/api";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({
  children,
  requiredRole
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (requiredRole && apiClient.getUserRole() !== requiredRole) {
      navigate('/dashboard');
    }
  }, [navigate, requiredRole]);

  if (!apiClient.isAuthenticated()) {
    return null;
  }

  if (requiredRole && apiClient.getUserRole() !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pgp-setup" element={<ProtectedRoute requiredRole="admin"><PgpSetup /></ProtectedRoute>} />

            {/* Admin-only routes */}
            <Route path="/products" element={<ProtectedRoute requiredRole="admin"><ProductsManagement /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute requiredRole="admin"><OrdersOverview /></ProtectedRoute>} />
            <Route path="/wallets" element={<ProtectedRoute requiredRole="admin"><WalletManagement /></ProtectedRoute>} />

            {/* User routes */}
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />

            {/* Shopping cart routes */}
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/payment/:orderId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />

            {/* Public routes */}
            <Route path="/products/browse" element={<ProductsBrowse />} />
            <Route path="/products-browse" element={<Navigate to="/products/browse" replace />} />
            <Route path="/crypto" element={<Index />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
