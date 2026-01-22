import { Store, LogIn, LogOut, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CartSheet } from './CartSheet';
import { SettingsModal } from './SettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { CartItem } from '@/hooks/useCart';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface ShopHeaderProps {
  cartItems: CartItem[];
  cartCount?: number;
  cartTotal?: number;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
}

export function ShopHeader({
  cartItems,
  cartCount,
  cartTotal,
  onUpdateQuantity,
  onRemove,
}: ShopHeaderProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const navigate = useNavigate();

  // Calculate cart count and total if not provided
  const displayCount = cartCount ?? cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const displayTotal = cartTotal ?? 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/shop" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Store className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">CryptoShop</span>
        </Link>

        <div className="flex items-center gap-3">
          <SettingsModal />
          <ThemeToggle />
          
          <CartSheet
            cartItems={cartItems}
            cartCount={displayCount}
            cartTotal={displayTotal}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />

          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                  <Shield className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
                <User className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
