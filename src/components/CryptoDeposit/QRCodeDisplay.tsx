import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import type { Currency } from "./CurrencySelector";
interface QRCodeDisplayProps {
  currency: Currency;
  showAmount?: boolean;
  amount?: string;
  fiatAmount?: string;
  fiatCurrency?: string;
}
const QRCodeDisplay = ({
  currency,
  showAmount = false,
  amount = "0.00",
  fiatAmount = "150.00",
  fiatCurrency = "USD"
}: QRCodeDisplayProps) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(currency.address);
    setCopiedAddress(true);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    });
    setTimeout(() => setCopiedAddress(false), 2000);
  };
  const handleCopyAmount = async () => {
    await navigator.clipboard.writeText(amount);
    setCopiedAmount(true);
    toast({
      title: "Copied!",
      description: "Amount copied to clipboard"
    });
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Generate payment URI for QR code
  const getPaymentUri = () => {
    const prefix = {
      btc: "bitcoin",
      eth: "ethereum",
      usdt: "ethereum",
      sol: "solana",
      xmr: "monero"
    }[currency.id] || currency.id;
    if (showAmount && parseFloat(amount) > 0) {
      return `${prefix}:${currency.address}?amount=${amount}`;
    }
    return currency.address;
  };
  return <div className="flex flex-col items-center gap-4 py-6">
      {/* Real QR Code */}
      <div className="bg-foreground p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={handleCopyAddress} title="Click to copy address">
        <QRCodeSVG value={getPaymentUri()} size={128} bgColor="hsl(220, 20%, 95%)" fgColor="hsl(230, 25%, 8%)" level="M" />
      </div>

      {/* Address with copy button */}
      <div className="w-full">
        <label className="block text-sm text-muted-foreground mb-2">Send to Address</label>
        <button onClick={handleCopyAddress} className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-secondary border border-border hover:border-primary/50 transition-colors text-left">
          <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
            {currency.address}
          </span>
          {copiedAddress ? <Check className="w-4 h-4 text-crypto-green flex-shrink-0" /> : <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        </button>
      </div>

      {/* Amount to pay (for payment processor) - now below address */}
      {showAmount && <div className="w-full">
          <label className="block text-sm text-muted-foreground mb-2 text-center">Amount to Pay</label>
          <button onClick={handleCopyAmount} className="w-full flex flex-col gap-1 p-3 rounded-lg bg-secondary border border-border hover:border-primary/50 transition-colors">
            <div className="w-full flex items-center justify-between">
              <span className="text-lg font-semibold">
                {amount} <span className="text-muted-foreground">{currency.symbol}</span>
              </span>
              {copiedAmount ? <Check className="w-4 h-4 text-crypto-green flex-shrink-0" /> : <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
            {/* FIAT amount with gradient - inside copy box */}
            <span className="text-xs font-medium bg-gradient-to-r from-muted-foreground to-muted-foreground/50 bg-clip-text text-transparent">
              ≈ ${fiatAmount} {fiatCurrency}
            </span>
          </button>
        </div>}
      
      
    </div>;
};
export default QRCodeDisplay;