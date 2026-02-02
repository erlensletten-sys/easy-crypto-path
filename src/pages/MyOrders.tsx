import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { ShoppingBag, AlertCircle, ArrowLeft } from "lucide-react";
import PaymentVerification from "@/components/PaymentVerification";

const MyOrders = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate("/login");
      return;
    }

    loadOrders();
  }, [navigate]);

  const loadOrders = async () => {
    try {
      const data = await apiClient.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
      if (err instanceof Error && err.message.includes("token")) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      shipped: "outline",
      delivered: "outline",
      cancelled: "destructive",
    };

    return <Badge variant={variants[status] || "outline"}>{t(`orders.${status}`)}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
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
            <h1 className="text-3xl font-bold">{t('orders.myOrders')}</h1>
            <p className="text-muted-foreground">{t('orders.myOrdersDescription')}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('orders.title')}</CardTitle>
            <CardDescription>
              {t('orders.myOrdersDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('orders.noOrders')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('orders.ordersAppearHere')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('orders.orderNumber')}</TableHead>
                      <TableHead>{t('orders.items')}</TableHead>
                      <TableHead>{t('orders.total')}</TableHead>
                      <TableHead>{t('orders.status')}</TableHead>
                      <TableHead>{t('orders.payment')}</TableHead>
                      <TableHead>{t('orders.date')}</TableHead>
                      <TableHead>{t('wallets.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {order.items || "N/A"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {order.total_amount.toLocaleString('no-NO')} kr
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="uppercase text-muted-foreground">
                              {order.payment_method || "N/A"}
                            </div>
                            {order.payment_tx_hash && (
                              <div className="font-mono text-xs text-muted-foreground">
                                {order.payment_tx_hash.substring(0, 10)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('no-NO')}
                        </TableCell>
                        <TableCell>
                          {!order.payment_tx_hash && (
                            <PaymentVerification
                              orderId={order.id}
                              orderNumber={order.order_number}
                              totalAmount={order.total_amount}
                              onVerified={loadOrders}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyOrders;
