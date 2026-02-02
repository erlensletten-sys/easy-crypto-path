import { useAdminOrders } from '@/hooks/useAdminOrders';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShoppingCart, Eye, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function AdminOrders() {
  const { orders, loading, refreshOrders, updateOrderStatus } = useAdminOrders();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Orders</h2>
          <span className="text-muted-foreground">({orders.length})</span>
        </div>

        <Button variant="outline" onClick={refreshOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">
                  {order.id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  {order.profile?.display_name || order.profile?.email || 'Unknown'}
                </TableCell>
                <TableCell>{order.order_items.length} items</TableCell>
                <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[order.status] || ''}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-[130px]">
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

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Order ID:</span>
                              <p className="font-mono">{order.id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <p>{format(new Date(order.created_at), 'PPpp')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Customer:</span>
                              <p>{order.profile?.email || 'Unknown'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <Badge
                                variant="outline"
                                className={statusColors[order.status] || ''}
                              >
                                {order.status}
                              </Badge>
                            </div>
                          </div>

                          {order.shipping_address && (
                            <div>
                              <span className="text-muted-foreground text-sm">
                                Shipping Address:
                              </span>
                              <p className="whitespace-pre-wrap">{order.shipping_address}</p>
                            </div>
                          )}

                          <div>
                            <span className="text-muted-foreground text-sm">Items:</span>
                            <div className="border rounded-lg mt-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.order_items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell>
                                        {item.product?.name || 'Unknown Product'}
                                      </TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>
                                        ${item.price_at_purchase.toFixed(2)}
                                      </TableCell>
                                      <TableCell>
                                        ${(item.price_at_purchase * item.quantity).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          <div className="flex justify-end text-lg font-semibold">
                            Total: ${order.total.toFixed(2)}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
