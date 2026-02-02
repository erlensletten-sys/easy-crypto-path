import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface PaymentVerificationProps {
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  onVerified?: () => void;
}

const PaymentVerification = ({
  orderId,
  orderNumber,
  totalAmount,
  onVerified,
}: PaymentVerificationProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [cryptoId, setCryptoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);

  const cryptoOptions = [
    { value: "btc", label: "Bitcoin (BTC)" },
    { value: "eth", label: "Ethereum (ETH)" },
    { value: "usdt", label: "Tether (USDT)" },
    { value: "usdc", label: "USD Coin (USDC)" },
    { value: "bnb", label: "Binance Coin (BNB)" },
  ];

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!txHash || !cryptoId) {
      toast({
        title: t('errors.invalidInput'),
        description: t('crypto.enterTxHash'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await apiClient.verifyPayment(orderId, txHash, cryptoId);
      setPaymentStatus(result);

      if (result.verification?.status === 'verified') {
        toast({
          title: t('crypto.paymentVerified'),
          description: `${result.verification.confirmations} ${t('crypto.confirmations')}`,
        });
      } else {
        toast({
          title: t('crypto.paymentPending'),
          description: `${result.verification?.confirmations || 0}/${result.verification?.minConfirmations || 0} ${t('crypto.confirmations')}`,
        });
      }

      if (onVerified) {
        onVerified();
      }

      // Don't close the dialog, show the status instead
    } catch (error) {
      toast({
        title: t('crypto.verificationFailed'),
        description: error instanceof Error ? error.message : t('errors.tryAgain'),
        variant: "destructive",
      });
      setPaymentStatus(null); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const result = await apiClient.refreshPayment(orderId);
      setPaymentStatus(result);

      if (result.verification?.status === 'verified') {
        toast({
          title: t('crypto.paymentVerified'),
          description: `${result.verification.confirmations} ${t('crypto.confirmations')}`,
        });

        if (onVerified) {
          onVerified();
        }
      } else {
        toast({
          title: "Status oppdatert",
          description: `${result.verification?.confirmations || 0}/${result.verification?.minConfirmations || 0} ${t('crypto.confirmations')}`,
        });
      }
    } catch (error) {
      toast({
        title: "Oppdatering mislyktes",
        description: error instanceof Error ? error.message : t('errors.tryAgain'),
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {t(`crypto.${status}`) || status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {t('crypto.verifyPayment')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('crypto.payment')}</DialogTitle>
          <DialogDescription>
            {t('orders.orderNumber')}: <strong>{orderNumber}</strong>
            <br />
            {t('orders.total')}: <strong>{totalAmount.toLocaleString('no-NO')} kr</strong>
          </DialogDescription>
        </DialogHeader>

        {!paymentStatus ? (
          <form onSubmit={handleVerifyPayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cryptoId">{t('crypto.selectCrypto')}</Label>
              <Select value={cryptoId} onValueChange={setCryptoId}>
                <SelectTrigger id="cryptoId">
                  <SelectValue placeholder={t('crypto.selectCrypto')} />
                </SelectTrigger>
                <SelectContent>
                  {cryptoOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txHash">{t('crypto.txHash')}</Label>
              <Input
                id="txHash"
                type="text"
                placeholder={t('crypto.enterTxHash')}
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('crypto.checking') : t('crypto.verify')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(paymentStatus.transaction?.status || 'pending')}
                <div>
                  <p className="font-medium">{t('orders.status')}</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentStatus.transaction?.status || 'pending'}
                  </p>
                </div>
              </div>
              {getStatusBadge(paymentStatus.transaction?.status || 'pending')}
            </div>

            {paymentStatus.verification && (
              <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Bekreftelser fra blockchain</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshStatus}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('crypto.confirmations')}:</span>
                  <span className="font-bold">
                    {paymentStatus.verification.confirmations}/{paymentStatus.verification.minConfirmations}
                  </span>
                </div>
                {paymentStatus.verification.status === 'verified' && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ Transaksjon bekreftet på blockchain
                  </p>
                )}
                {paymentStatus.verification.status === 'pending' && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Venter på flere bekreftelser...
                  </p>
                )}
              </div>
            )}

            {paymentStatus.transaction && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('crypto.amount')}:</span>
                  <span className="font-medium">
                    {paymentStatus.transaction.amount} {paymentStatus.transaction.crypto_id.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  <span className="font-medium">{t('crypto.txHash')}:</span> {paymentStatus.transaction.tx_hash}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {paymentStatus.verification?.status === 'pending' && (
                <Button
                  variant="outline"
                  onClick={handleRefreshStatus}
                  disabled={refreshing}
                >
                  {refreshing ? t('crypto.checking') : 'Sjekk på nytt'}
                </Button>
              )}
              <Button onClick={() => setOpen(false)}>
                {t('common.close') || 'Close'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentVerification;
