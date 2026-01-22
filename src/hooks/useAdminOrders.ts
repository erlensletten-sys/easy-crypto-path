import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    product: Tables<'products'> | null;
  })[];
  profile?: {
    email: string | null;
    display_name: string | null;
  } | null;
}

export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each order
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('user_id', order.user_id)
            .maybeSingle();
          
          return { ...order, profile };
        })
      );

      setOrders(ordersWithProfiles as OrderWithItems[]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
      
      toast.success('Order status updated');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order status');
      return { error };
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    refreshOrders: fetchOrders,
    updateOrderStatus,
  };
}
