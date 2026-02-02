import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: {
    date: string;
    revenue: number;
    count: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  ordersByStatus: {
    status: string;
    count: number;
  }[];
}

export function useAdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    recentOrders: [],
    topProducts: [],
    ordersByStatus: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*');

      if (ordersError) throw ordersError;

      // Fetch order items with products
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products (id, name)
        `);

      if (itemsError) throw itemsError;

      // Fetch products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Fetch users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Calculate analytics
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const totalOrders = orders?.length || 0;

      // Group orders by date (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const recentOrders = last7Days.map((date) => {
        const dayOrders = orders?.filter(
          (o) => o.created_at.split('T')[0] === date
        ) || [];
        return {
          date,
          revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
          count: dayOrders.length,
        };
      });

      // Calculate top products
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      orderItems?.forEach((item) => {
        const productId = item.product_id;
        const productName = (item.product as any)?.name || 'Unknown';
        if (!productSales[productId]) {
          productSales[productId] = { name: productName, sales: 0, revenue: 0 };
        }
        productSales[productId].sales += item.quantity;
        productSales[productId].revenue += Number(item.price_at_purchase) * item.quantity;
      });

      const topProducts = Object.entries(productSales)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Orders by status
      const statusCounts: Record<string, number> = {};
      orders?.forEach((order) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      }));

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalProducts: productsCount || 0,
        totalUsers: usersCount || 0,
        recentOrders,
        topProducts,
        ordersByStatus,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    loading,
    refreshAnalytics: fetchAnalytics,
  };
}
