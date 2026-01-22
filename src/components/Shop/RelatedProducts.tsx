import { ProductCard } from './ProductCard';
import { Product } from '@/hooks/useProducts';

interface RelatedProductsProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
}

export function RelatedProducts({ products, onAddToCart }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
