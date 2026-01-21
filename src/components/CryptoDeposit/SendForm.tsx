import { useState } from "react";
import { Send, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Currency } from "./CurrencySelector";

interface SendFormProps {
  currency: Currency;
}

const SendForm = ({ currency }: SendFormProps) => {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

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
    
    if (!amount || parseFloat(amount) <= 0) {
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
        description: `Sending ${amount} ${currency.symbol} to ${address.slice(0, 8)}...${address.slice(-6)}`,
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
        <label className="block text-sm text-muted-foreground mb-2">
          Amount
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00000000"
            step="0.00000001"
            min="0"
            className="w-full p-3 pr-16 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:outline-none transition-colors text-sm font-mono placeholder:text-muted-foreground/50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
            {currency.symbol}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Available: {currency.balance} {currency.symbol}
        </p>
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
