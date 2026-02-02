import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { Package, AlertCircle, ShoppingCart, LogIn } from "lucide-react";

const ProductsBrowse = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await apiClient.getPublicProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Browse Products</h1>
            <p className="text-muted-foreground">Discover our available products</p>
          </div>
          <div className="flex gap-2">
            {!apiClient.isAuthenticated() && (
              <Button onClick={() => navigate("/login")}>
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
            {apiClient.isAuthenticated() && (
              <Button onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                {product.image_url && (
                  <div className="w-full h-48 bg-muted overflow-hidden rounded-t-lg">
                    <img
                      src={`http://localhost:3001${product.image_url}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
                      }}
                    />
                  </div>
                )}
                {!product.image_url && (
                  <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <Badge variant="outline">${product.price}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {product.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                        {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
                      </span>
                    </div>
                    {product.category && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge variant="secondary">{product.category}</Badge>
                      </div>
                    )}
                    <Button
                      className="w-full mt-4"
                      disabled={product.stock === 0}
                      onClick={() => {
                        if (!apiClient.isAuthenticated()) {
                          navigate('/login');
                        } else {
                          // Future: Add to cart or order functionality
                          alert('Order functionality coming soon!');
                        }
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {product.stock > 0 ? "Order Now" : "Out of Stock"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsBrowse;
