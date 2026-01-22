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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, Loader2, Copy, Check, ChevronDown, HelpCircle } from 'lucide-react';
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

const BUY_CRYPTO_LINKS = [
  {
    name: 'Swapped',
    url: 'https://swapped.com',
    description: 'Fast and simple',
    gradient: 'from-violet-500 to-purple-600',
    icon: 'S',
  },
  {
    name: 'MoonPay',
    url: 'https://moonpay.com',
    description: 'Cards & bank transfers',
    gradient: 'from-purple-600 to-indigo-700',
    icon: null,
    isMoon: true,
  },
  {
    name: 'Ramp Network',
    url: 'https://ramp.network',
    description: 'Beginner friendly',
    gradient: 'from-emerald-500 to-teal-600',
    icon: 'R',
  },
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
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('deposit');
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  
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

    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [paymentDetails?.payment_id, clearCart, toast]);

  const handleCopyAddress = async () => {
    if (!paymentDetails?.pay_address) return;
    await navigator.clipboard.writeText(paymentDetails.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Address copied!' });
  };

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

  const handleContinueToPayment = () => {
    const validation = checkoutSchema.safeParse({ address });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }
    setStep('payment');
  };

  const handleCreatePayment = async () => {
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

  // Wallet-style payment UI
  const WalletPaymentCard = () => (
    <div className="w-full max-w-sm mx-auto">
      <h2 className="text-lg font-semibold mb-3 text-center">Pay ${cartTotal.toFixed(2)}</h2>
      <div className="gradient-card rounded-xl border border-border overflow-hidden bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 bg-transparent border-b border-border rounded-none h-12">
            <TabsTrigger
              value="deposit"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              Deposit
            </TabsTrigger>
            <TabsTrigger
              value="withdraw"
              disabled
              className="text-muted-foreground/50 rounded-none"
            >
              Withdraw
            </TabsTrigger>
            <TabsTrigger
              value="buy-crypto"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              Buy Crypto
            </TabsTrigger>
          </TabsList>

          <div className="p-4 min-h-[320px]">
            <TabsContent value="deposit" className="mt-0 space-y-4">
              {/* Currency Selector */}
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full ${selectedCrypto.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs font-bold text-white">{selectedCrypto.symbol[0]}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{selectedCrypto.name} ({selectedCrypto.symbol})</p>
                    </div>
                    {paymentDetails && (
                      <span className="text-sm text-muted-foreground font-mono">
                        {paymentDetails.pay_amount.toFixed(8)}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2" align="start">
                  {CRYPTO_OPTIONS.map((crypto) => (
                    <button
                      key={crypto.id}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => {
                        setSelectedCrypto(crypto);
                        setCurrencyOpen(false);
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full ${crypto.color} flex items-center justify-center`}>
                        <span className="text-xs font-bold text-white">{crypto.symbol[0]}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{crypto.name}</p>
                        <p className="text-xs text-muted-foreground">{crypto.symbol}</p>
                      </div>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {paymentDetails ? (
                <>
                  {/* QR Code */}
                  <div className="flex justify-center py-2">
                    <div className="bg-white p-3 rounded-lg">
                      <QRCodeSVG
                        value={paymentDetails.pay_address}
                        size={160}
                        level="H"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Send to Address</p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="flex-1 text-xs font-mono truncate">
                        {paymentDetails.pay_address}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    {checkingStatus && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span className="capitalize">{paymentDetails.payment_status.replace('_', ' ')}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Click below to generate a {selectedCrypto.symbol} payment address
                  </p>
                  <Button
                    onClick={handleCreatePayment}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Payment...
                      </>
                    ) : (
                      `Generate ${selectedCrypto.symbol} Address`
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="buy-crypto" className="mt-0 space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Purchase cryptocurrency using trusted payment providers
                </p>
              </div>
              <div className="space-y-2">
                {BUY_CRYPTO_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${link.gradient} flex items-center justify-center flex-shrink-0`}>
                      {link.isMoon ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold text-white">{link.icon}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{link.name}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Availability, fees, and verification may vary by provider and region.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        {/* Support link */}
        <button
          className="w-full py-3 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border flex items-center justify-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Support
        </button>
      </div>

      {paymentDetails && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => navigate('/orders')}
        >
          View Order Status
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" onClick={() => step === 'payment' ? setStep('shipping') : navigate('/shop')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 'payment' ? 'Back to Shipping' : 'Back to Shop'}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>

        {step === 'shipping' ? (
          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
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

            {/* Order Summary */}
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

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleContinueToPayment}
                >
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <WalletPaymentCard />
        )}
      </main>
    </div>
  );
}
