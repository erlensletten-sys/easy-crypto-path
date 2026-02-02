import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/contexts/CartContext";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    shipping_address: "",
    notes: "",
  });

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create order
      const orderData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        shipping_address: formData.shipping_address,
        notes: formData.notes,
        payment_method: 'crypto',
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const order = await apiClient.createOrder(orderData);

      toast({
        title: t('checkout.orderCreated'),
        description: t('checkout.orderCreatedDescription', { orderNumber: order.order_number }),
      });

      // Clear cart
      clearCart();

      // Redirect to payment page
      navigate(`/payment/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.orderFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/cart')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('checkout.title')}</h1>
            <p className="text-muted-foreground">{t('checkout.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('checkout.customerDetails')}</CardTitle>
                <CardDescription>{t('checkout.customerDetailsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="customer_name">{t('checkout.fullName')} *</Label>
                    <Input
                      id="customer_name"
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      required
                      placeholder={t('checkout.fullNamePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_email">{t('checkout.email')} *</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      required
                      placeholder={t('checkout.emailPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping_address">{t('checkout.shippingAddress')} *</Label>
                    <Textarea
                      id="shipping_address"
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      required
                      rows={3}
                      placeholder={t('checkout.shippingAddressPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">{t('checkout.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder={t('checkout.notesPlaceholder')}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? t('checkout.processing') : t('checkout.placeOrder')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{t('cart.orderSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-muted-foreground">
                          {item.quantity} × {item.price.toFixed(2)} kr
                        </p>
                      </div>
                      <p className="font-medium">
                        {(item.price * item.quantity).toFixed(2)} kr
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                    <span>{getTotalPrice().toFixed(2)} kr</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('cart.total')}</span>
                    <span>{getTotalPrice().toFixed(2)} kr</span>
                  </div>
                </div>

                <Alert>
                  <ShoppingCart className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {t('checkout.paymentInfo')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
