import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        product:products (
          id,
          name,
          price,
          image_url
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching cart:', error);
    } else {
      // Transform the data to match our CartItem interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        product: item.product
      }));
      setCartItems(transformedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add items to cart",
        variant: "destructive",
      });
      return false;
    }

    // Check if item already in cart
    const existingItem = cartItems.find(item => item.product_id === productId);

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update cart",
          variant: "destructive",
        });
        return false;
      }
    } else {
      // Add new item
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add to cart",
          variant: "destructive",
        });
        return false;
      }
    }

    toast({
      title: "Added to cart",
      description: "Item has been added to your cart",
    });

    await fetchCart();
    return true;
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(cartItemId);
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
      return false;
    }

    await fetchCart();
    return true;
  };

  const removeFromCart = async (cartItemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
      return false;
    }

    await fetchCart();
    return true;
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing cart:', error);
    }

    setCartItems([]);
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + (item.product?.price || 0) * item.quantity,
    0
  );

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount,
    refetch: fetchCart,
  };
}
