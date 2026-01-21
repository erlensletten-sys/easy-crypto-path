import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Currency } from "./CurrencySelector";

interface QRCodeDisplayProps {
  currency: Currency;
}

const QRCodeDisplay = ({ currency }: QRCodeDisplayProps) => {
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(currency.address);
    setCopiedAddress(true);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Generate a deterministic pattern based on address
  const getPattern = (address: string) => {
    return Array.from({ length: 64 }).map((_, i) => {
      const charCode = address.charCodeAt(i % address.length) || 0;
      return (charCode + i) % 3 !== 0;
    });
  };

  const pattern = getPattern(currency.address);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* QR Code */}
      <div 
        className="bg-foreground p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleCopyAddress}
        title="Click to copy address"
      >
        <div className="w-32 h-32 grid grid-cols-8 gap-0.5">
          {pattern.map((filled, i) => (
            <div
              key={i}
              className="w-full aspect-square"
              style={{
                backgroundColor: filled ? 'hsl(230 25% 8%)' : 'transparent'
              }}
            />
          ))}
        </div>
      </div>

      {/* Address with copy button */}
      <div className="w-full">
        <button
          onClick={handleCopyAddress}
          className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-secondary border border-border hover:border-primary/50 transition-colors text-left"
        >
          <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
            {currency.address}
          </span>
          {copiedAddress ? (
            <Check className="w-4 h-4 text-crypto-green flex-shrink-0" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </div>
      
      <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Deposit history
      </button>
    </div>
  );
};

export default QRCodeDisplay;
