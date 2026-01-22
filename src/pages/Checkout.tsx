import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, Loader2, Copy, Check } from 'lucide-react';
import { z } from 'zod';
import { QRCodeSVG } from 'qrcode.react';

const checkoutSchema = z.object({
  address: z.string().min(10, 'Please enter a valid address').max(500),
});

const CRYPTO_OPTIONS = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', color: 'bg-orange-500' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', color: 'bg-blue-500' },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', color: 'bg-green-500' },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', color: 'bg-gray-400' },
  { id: 'xmr', name: 'Monero', symbol: 'XMR', color: 'bg-orange-600' },
];

interface PaymentDetails {
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  payment_status: string;
}

export default function Checkout() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_OPTIONS[0]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Poll for payment status
  useEffect(() => {
    if (!paymentDetails?.payment_id) return;

    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await supabase.functions.invoke('check-payment-status', {
          body: null,
          headers: {},
        });

        // Use query params approach
        const { data, error } = await supabase.functions.invoke(
          `check-payment-status?paymentId=${paymentDetails.payment_id}`,
          { method: 'GET' }
        );

        if (!error && data?.payment_status) {
          setPaymentDetails(prev => prev ? { ...prev, payment_status: data.payment_status } : null);
          
          if (['finished', 'confirmed'].includes(data.payment_status)) {
            setOrderComplete(true);
            await clearCart();
            toast({
              title: 'Payment confirmed!',
              description: 'Your order has been successfully placed.',
            });
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
      setCheckingStatus(false);
    };

    const interval = setInterval(checkStatus, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [paymentDetails?.payment_id, clearCart, toast]);

  const handleCopyAddress = async () => {
    if (!paymentDetails?.pay_address) return;
    await navigator.clipboard.writeText(paymentDetails.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Address copied!' });
  };

  // Early return for empty cart (after hooks)
  if (!user) {
    return null;
  }

  if (cartItems.length === 0 && !orderComplete && !paymentDetails) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Button onClick={() => navigate('/shop')}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  const handleCheckout = async () => {
    const validation = checkoutSchema.safeParse({ address });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: cartTotal,
          shipping_address: address,
          status: 'pending',
          payment_status: 'awaiting_payment',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.product?.price || 0,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderId(order.id);

      // Create crypto payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-crypto-payment',
        {
          body: {
            orderId: order.id,
            amount: cartTotal,
            currency: selectedCrypto.id,
          },
        }
      );

      if (paymentError) {
        throw new Error(paymentError.message || 'Failed to create payment');
      }

      if (!paymentData?.payment) {
        throw new Error(paymentData?.error || 'Failed to create payment');
      }

      setPaymentDetails(paymentData.payment);

      toast({
        title: 'Payment created',
        description: `Send ${selectedCrypto.symbol} to the address shown below.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. Your order is now being processed.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/orders')}>
                View Orders
              </Button>
              <Button onClick={() => navigate('/shop')}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment pending - show QR and address
  if (paymentDetails) {
    const statusColors: Record<string, string> = {
      waiting: 'bg-yellow-500',
      confirming: 'bg-blue-500',
      confirmed: 'bg-green-500',
      sending: 'bg-blue-500',
      finished: 'bg-green-500',
      failed: 'bg-destructive',
      expired: 'bg-muted',
    };

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Button variant="ghost" onClick={() => navigate('/shop')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shop
            </Button>
          </div>
        </header>

        <main className="container py-8 flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Complete Your Payment</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${statusColors[paymentDetails.payment_status] || 'bg-muted'}`} />
                <span className="text-sm text-muted-foreground capitalize">
                  {paymentDetails.payment_status.replace('_', ' ')}
                </span>
                {checkingStatus && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Send exactly</p>
                <p className="text-2xl font-bold">
                  {paymentDetails.pay_amount} {paymentDetails.pay_currency.toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ ${cartTotal.toFixed(2)} USD
                </p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={paymentDetails.pay_address}
                    size={180}
                    level="H"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Payment Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={paymentDetails.pay_address}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyAddress}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Waiting for payment... This page will update automatically once your payment is detected.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/orders')}
              >
                View Order Status
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" onClick={() => navigate('/shop')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Shipping Info */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Shipping Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter your full shipping address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary & Payment */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product?.name} × {item.quantity}
                    </span>
                    <span>${((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Payment Currency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {CRYPTO_OPTIONS.map((crypto) => (
                    <Button
                      key={crypto.id}
                      variant={selectedCrypto.id === crypto.id ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-3"
                      onClick={() => setSelectedCrypto(crypto)}
                    >
                      <span className={`w-6 h-6 rounded-full ${crypto.color} mb-1`} />
                      <span className="text-xs">{crypto.symbol}</span>
                    </Button>
                  ))}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Payment...
                    </>
                  ) : (
                    `Pay with ${selectedCrypto.symbol}`
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Payments are processed securely via NOWPayments.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
