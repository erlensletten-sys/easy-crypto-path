import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, AlertCircle, CheckCircle, Clock, ArrowLeft } from "lucide-react";

const Payment = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const data = await apiClient.getOrder(parseInt(orderId!));
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadOrders'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('errors.error')}</h2>
            <p className="text-muted-foreground mb-6 text-center">{error}</p>
            <Button onClick={() => navigate('/dashboard')}>
              {t('common.dashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.dashboard')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('payment.title')}</h1>
            <p className="text-muted-foreground">{order.order_number}</p>
          </div>
        </div>

        {/* Success Message */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t('payment.orderCreatedSuccess')}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('payment.orderDetails')}</CardTitle>
                <CardDescription>{t('payment.reviewOrder')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('orders.orderNumber')}</p>
                    <p className="font-medium">{order.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('orders.status')}</p>
                    <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                      {t(`orders.${order.status}`)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('checkout.email')}</p>
                    <p className="font-medium">{order.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('orders.total')}</p>
                    <p className="font-medium">{order.total_amount.toFixed(2)} kr</p>
                  </div>
                </div>

                {order.shipping_address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('checkout.shippingAddress')}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{order.shipping_address}</p>
                  </div>
                )}

                {order.items && order.items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-semibold mb-3">{t('orders.items')}</p>
                      <div className="space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Instructions */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{t('payment.nextSteps')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {t('payment.awaitingPayment')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 text-sm">
                  <p className="font-semibold">{t('payment.instructions')}</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>{t('payment.step1')}</li>
                    <li>{t('payment.step2')}</li>
                    <li>{t('payment.step3')}</li>
                  </ol>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => navigate('/my-orders')}>
                    {t('payment.viewMyOrders')}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/products/browse')}>
                    {t('cart.continueShopping')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
