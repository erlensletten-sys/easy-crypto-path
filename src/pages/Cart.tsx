import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package } from "lucide-react";
import { apiClient } from "@/lib/api";

const Cart = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, getTotalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('cart.emptyCart')}</h2>
            <p className="text-muted-foreground mb-6 text-center">
              {t('cart.emptyCartDescription')}
            </p>
            <Button onClick={() => navigate('/products/browse')}>
              <Package className="h-4 w-4 mr-2" />
              {t('cart.continueShopping')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/products/browse')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('cart.title')}</h1>
            <p className="text-muted-foreground">
              {t('cart.itemsCount', { count: items.length })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.product_id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    {item.image_url ? (
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={`http://localhost:3001${item.image_url}`}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/96?text=Product';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{item.product_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('cart.pricePerItem')}: {item.price.toFixed(2)} kr
                        </p>
                        {item.quantity >= item.stock && (
                          <p className="text-sm text-red-600">
                            {t('cart.maxStockReached')}
                          </p>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.product_id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {(item.price * item.quantity).toFixed(2)} kr
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{t('cart.orderSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                    <span>{getTotalPrice().toFixed(2)} kr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('cart.shipping')}</span>
                    <span>{t('cart.calculated')}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>{t('cart.total')}</span>
                      <span>{getTotalPrice().toFixed(2)} kr</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate('/checkout')}
                >
                  {t('cart.proceedToCheckout')}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/products/browse')}
                >
                  {t('cart.continueShopping')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
