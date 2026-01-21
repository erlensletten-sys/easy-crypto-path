import { useState } from "react";
import { ChevronDown, Check, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Currency {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  color: string;
  address: string;
}

const currencies: Currency[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", balance: "0.00000000", color: "bg-crypto-orange", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  { id: "eth", name: "Ethereum", symbol: "ETH", balance: "0.00000000", color: "bg-crypto-blue", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
  { id: "usdt", name: "Tether", symbol: "USDT", balance: "0.00000000", color: "bg-crypto-green", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
  { id: "sol", name: "Solana", symbol: "SOL", balance: "0.00000000", color: "bg-crypto-purple", address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
  { id: "xmr", name: "Monero", symbol: "XMR", balance: "0.00000000", color: "bg-crypto-gray", address: "48edfHu7V9Z84YzzMa6fUueoELZ9ZRXq9VetWzYGzKt52XU5xvqgzYnDK9URnRoJMk1j8nLwEVsaSWJ4fhdUyZijBGUicoD" },
];

interface CurrencySelectorProps {
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
  showBalance?: boolean;
}

export const CurrencySelector = ({ selectedCurrency, onSelect, showBalance = true }: CurrencySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedBalance, setCopiedBalance] = useState(false);

  const handleCopyBalance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showBalance) return;
    
    await navigator.clipboard.writeText(selectedCurrency.balance);
    setCopiedBalance(true);
    toast({
      title: "Copied!",
      description: `Balance ${selectedCurrency.balance} copied to clipboard`,
    });
    setTimeout(() => setCopiedBalance(false), 2000);
  };

  return (
    <div className="relative">
      <label className="block text-sm text-muted-foreground mb-2">Currency</label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary border border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${selectedCurrency.color} flex items-center justify-center`}>
            <span className="text-xs font-bold text-primary-foreground">
              {selectedCurrency.symbol.charAt(0)}
            </span>
          </div>
          <span className="font-medium">
            {selectedCurrency.name} ({selectedCurrency.symbol})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showBalance && (
            <button
              onClick={handleCopyBalance}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{selectedCurrency.balance}</span>
              {copiedBalance ? (
                <Check className="w-3 h-3 text-crypto-green" />
              ) : (
                <Copy className="w-3 h-3 opacity-50" />
              )}
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg overflow-hidden z-50 shadow-lg">
          {currencies.map((currency) => (
            <button
              key={currency.id}
              onClick={() => {
                onSelect(currency);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 hover:bg-secondary transition-colors ${
                selectedCurrency.id === currency.id ? 'bg-secondary text-primary' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full ${currency.color} flex items-center justify-center`}>
                  <span className="text-xs font-bold text-primary-foreground">
                    {currency.symbol.charAt(0)}
                  </span>
                </div>
                <span className={`font-medium ${selectedCurrency.id === currency.id ? 'text-primary' : ''}`}>
                  {currency.name} ({currency.symbol})
                </span>
              </div>
              {showBalance && (
                <span className={selectedCurrency.id === currency.id ? 'text-primary' : 'text-muted-foreground'}>
                  {currency.balance}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { currencies };
export type { Currency };
