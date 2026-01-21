import { useState } from "react";
import DepositTabs from "./DepositTabs";
import { CurrencySelector, currencies, type Currency } from "./CurrencySelector";
import QRCodeDisplay from "./QRCodeDisplay";
import SendForm from "./SendForm";

interface CryptoDepositProps {
  variant: "wallet" | "payment";
  title?: string;
  paymentAmount?: string;
}

const walletTabs = [
  { id: "deposit", label: "Deposit" },
  { id: "send", label: "Send" },
  { id: "how-to-buy", label: "How to buy crypto" },
  { id: "tip", label: "Tip" },
];

const paymentTabs = [
  { id: "deposit", label: "Pay" },
  { id: "how-to-buy", label: "How to buy crypto" },
];

const CryptoDeposit = ({ variant, title, paymentAmount = "0.05" }: CryptoDepositProps) => {
  const tabs = variant === "wallet" ? walletTabs : paymentTabs;
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[1]); // ETH default
  
  const showBalance = variant === "wallet";
  const isPaymentProcessor = variant === "payment";

  return (
    <div className="w-full max-w-sm">
      {title && (
        <h2 className="text-lg font-semibold mb-3 text-center">{title}</h2>
      )}
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <DepositTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        
        <div className="p-4">
          {activeTab === "deposit" && (
            <>
              <CurrencySelector
                selectedCurrency={selectedCurrency}
                onSelect={setSelectedCurrency}
                showBalance={showBalance}
              />
              <QRCodeDisplay 
                currency={selectedCurrency} 
                showAmount={isPaymentProcessor}
                amount={paymentAmount}
              />
            </>
          )}

          {activeTab === "send" && variant === "wallet" && (
            <>
              <CurrencySelector
                selectedCurrency={selectedCurrency}
                onSelect={setSelectedCurrency}
                showBalance={showBalance}
              />
              <SendForm currency={selectedCurrency} />
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
