import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type ProductInsert = TablesInsert<'products'>;
type ProductUpdate = TablesUpdate<'products'>;

export function useAdminProducts() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const createProduct = async (product: ProductInsert) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: string, product: ProductUpdate) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product');
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    loading,
  };
}
