import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { ShoppingBag, Eye, AlertCircle, ArrowLeft, Trash2 } from "lucide-react";

interface Order {
  id: number;
  order_number: string;
  customer_email: string;
  customer_name: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_tx_hash: string;
  shipping_address: string;
  notes: string;
  items: string;
  created_at: string;
}

interface OrderDetails extends Order {
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
}

const OrdersOverview = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate("/");
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
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (id: number) => {
    try {
      const order = await apiClient.getOrder(id);
      setSelectedOrder(order);
      setDetailsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order details");
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await apiClient.updateOrder(orderId, { status: newStatus });
      loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await apiClient.getOrder(orderId);
        setSelectedOrder(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      await apiClient.deleteOrder(id);
      loadOrders();
      if (selectedOrder && selectedOrder.id === id) {
        setDetailsOpen(false);
        setSelectedOrder(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete order");
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

    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      processing: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      shipped: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
      delivered: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Orders Overview</h1>
            <p className="text-muted-foreground">Manage customer orders</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Orders ({orders.length})</CardTitle>
            <CardDescription>View and manage all customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
                <p className="text-sm text-muted-foreground mt-1">Orders will appear here when customers make purchases</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{order.customer_email || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.items ? order.items.split(',').length + ' items' : '-'}
                        </TableCell>
                        <TableCell className="font-medium">${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewOrderDetails(order.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order #{selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {selectedOrder.customer_name || "N/A"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {selectedOrder.customer_email || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Order Information</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Date:</span>{" "}
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payment:</span>{" "}
                        {selectedOrder.payment_method || "crypto"}
                      </div>
                      {selectedOrder.payment_tx_hash && (
                        <div>
                          <span className="text-muted-foreground">TX Hash:</span>{" "}
                          <span className="font-mono text-xs">{selectedOrder.payment_tx_hash.substring(0, 16)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedOrder.shipping_address && (
                  <div>
                    <h3 className="font-semibold mb-2">Shipping Address</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedOrder.shipping_address}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>${(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-semibold">Total:</TableCell>
                        <TableCell className="font-semibold">${selectedOrder.total_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Update Status</Label>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) => handleStatusUpdate(selectedOrder.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OrdersOverview;
