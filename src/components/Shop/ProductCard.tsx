import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const navigate = useNavigate();
  const isOutOfStock = product.stock <= 0;

  const handleCardClick = () => {
    navigate(`/shop/product/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product.id);
  };

  return (
    <Card 
      className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/50 bg-card cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="aspect-[4/3] overflow-hidden relative">
        <img
          src={product.image_url || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">Out of Stock</span>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
      </CardContent>
      <CardFooter className="p-3 pt-0 flex items-center justify-between">
        <span className="text-base font-bold text-primary">
          ${product.price.toFixed(2)}
        </span>
        <Button
          size="sm"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="h-7 px-2 text-xs gap-1"
        >
          <ShoppingCart className="h-3 w-3" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
