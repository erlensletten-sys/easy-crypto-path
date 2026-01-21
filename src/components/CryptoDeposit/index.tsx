import { useState } from "react";
import DepositTabs from "./DepositTabs";
import { CurrencySelector, currencies, type Currency } from "./CurrencySelector";
import QRCodeDisplay from "./QRCodeDisplay";

const CryptoDeposit = () => {
  const [activeTab, setActiveTab] = useState("deposit");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[1]); // ETH default

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <DepositTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="p-4">
          {activeTab === "deposit" && (
            <>
              <CurrencySelector
                selectedCurrency={selectedCurrency}
                onSelect={setSelectedCurrency}
              />
              <QRCodeDisplay />
            </>
          )}
          
          {activeTab === "how-to-buy" && (
            <div className="py-8 text-center">
              <h3 className="text-lg font-semibold mb-2">How to buy crypto</h3>
              <p className="text-muted-foreground text-sm">
                Learn how to purchase cryptocurrency using various payment methods.
              </p>
            </div>
          )}
          
          {activeTab === "tip" && (
            <div className="py-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Send a Tip</h3>
              <p className="text-muted-foreground text-sm">
                Send crypto tips to your favorite creators.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoDeposit;
