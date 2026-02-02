import { useState, useMemo } from 'react';
import { ShopHeader } from '@/components/Shop/ShopHeader';
import { ProductGrid } from '@/components/Shop/ProductGrid';
import { CategoryFilter } from '@/components/Shop/CategoryFilter';
import { ProductSearch } from '@/components/Shop/ProductSearch';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';

export default function Shop() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { products, loading } = useProducts();
  const {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader
        cartItems={cartItems}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
      />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Crypto Products</h1>
          <p className="text-muted-foreground">
            Discover premium hardware, software, and educational resources
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <ProductSearch value={searchQuery} onChange={setSearchQuery} />
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <ProductGrid
          products={filteredProducts}
          loading={loading}
          onAddToCart={addToCart}
        />
      </main>
    </div>
  );
}
