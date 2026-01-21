import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Currency {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  color: string;
}

const currencies: Currency[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", balance: "0.00000000", color: "bg-crypto-orange" },
  { id: "eth", name: "Ethereum", symbol: "ETH", balance: "0.00000000", color: "bg-crypto-blue" },
  { id: "usdt", name: "Tether", symbol: "USDT", balance: "0.00000000", color: "bg-crypto-green" },
  { id: "usdc", name: "USD Coin", symbol: "USDC", balance: "0.00000000", color: "bg-crypto-blue" },
  { id: "shfl", name: "Shuffle", symbol: "SHFL", balance: "0.00000000", color: "bg-crypto-pink" },
];

interface CurrencySelectorProps {
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
}

export const CurrencySelector = ({ selectedCurrency, onSelect }: CurrencySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
          <span className="text-muted-foreground">{selectedCurrency.balance}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg overflow-hidden z-10 shadow-lg">
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
              <span className={selectedCurrency.id === currency.id ? 'text-primary' : 'text-muted-foreground'}>
                {currency.balance}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { currencies };
export type { Currency };
