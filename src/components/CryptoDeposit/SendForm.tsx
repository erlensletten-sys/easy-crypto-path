import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Currency } from "./CurrencySelector";
import { exchangeRates } from "./CurrencySelector";

interface SendFormProps {
  currency: Currency;
}

type InputMode = "crypto" | "fiat";

const SendForm = ({ currency }: SendFormProps) => {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("crypto");
  const [isSending, setIsSending] = useState(false);

  const rate = exchangeRates[currency.symbol as keyof typeof exchangeRates] || 1;

  const getCryptoAmount = (): number => {
    const numAmount = parseFloat(amount) || 0;
    return inputMode === "fiat" ? numAmount / rate : numAmount;
  };

  const getFiatAmount = (): number => {
    const numAmount = parseFloat(amount) || 0;
    return inputMode === "crypto" ? numAmount * rate : numAmount;
  };

  const formatFiat = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCrypto = (value: number): string => {
    return value.toFixed(8);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      toast({
        title: "Error",
        description: "Please enter a destination address",
        variant: "destructive",
      });
      return;
    }
    
    const cryptoAmount = getCryptoAmount();
    if (!amount || cryptoAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    // Simulate sending
    setTimeout(() => {
      toast({
        title: "Transaction Submitted",
        description: `Sending ${formatCrypto(cryptoAmount)} ${currency.symbol} (${formatFiat(getFiatAmount())}) to ${address.slice(0, 8)}...${address.slice(-6)}`,
      });
      setAddress("");
      setAmount("");
      setIsSending(false);
    }, 1500);
  };

  return (
    <form onSubmit={handleSend} className="space-y-4 py-4">
      <div>
        <label className="block text-sm text-muted-foreground mb-2">
          Destination Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={`Enter ${currency.symbol} address`}
          className="w-full p-3 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:outline-none transition-colors text-sm font-mono placeholder:text-muted-foreground/50"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-muted-foreground">
            Amount
          </label>
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-secondary border border-border">
            <button
              type="button"
              onClick={() => setInputMode("crypto")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                inputMode === "crypto" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {currency.symbol}
            </button>
            <button
              type="button"
              onClick={() => setInputMode("fiat")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                inputMode === "fiat" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              USD
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={inputMode === "crypto" ? "0.00000000" : "0.00"}
            step={inputMode === "crypto" ? "0.00000001" : "0.01"}
            min="0"
            className="w-full p-3 pr-16 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:outline-none transition-colors text-sm font-mono placeholder:text-muted-foreground/50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
            {inputMode === "crypto" ? currency.symbol : "USD"}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            Available: {currency.balance} {currency.symbol}
          </p>
          {amount && parseFloat(amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              ≈ {inputMode === "crypto" 
                ? formatFiat(getFiatAmount()) 
                : `${formatCrypto(getCryptoAmount())} ${currency.symbol}`}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSending}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSending ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send {currency.symbol}
          </>
        )}
      </button>
    </form>
  );
};

export default SendForm;
