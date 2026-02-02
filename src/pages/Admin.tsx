import { Navigate, Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminProducts } from '@/components/Admin/AdminProducts';
import { AdminOrders } from '@/components/Admin/AdminOrders';
import { AdminUsers } from '@/components/Admin/AdminUsers';
import { AdminAnalytics } from '@/components/Admin/AdminAnalytics';
import { AdminSettings } from '@/components/Admin/AdminSettings';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  ArrowLeft,
} from 'lucide-react';

export default function Admin() {
  const { isAdmin, loading, user } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container flex h-16 items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="container py-8">
          <Skeleton className="h-12 w-full mb-8" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the admin panel.
          </p>
          <Button asChild>
            <Link to="/shop">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shop
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/shop" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Shop
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Admin Panel</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs defaultValue="analytics" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="analytics" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
