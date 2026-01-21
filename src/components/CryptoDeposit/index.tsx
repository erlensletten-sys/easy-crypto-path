import { useState } from "react";
import DepositTabs from "./DepositTabs";
import { CurrencySelector, currencies, type Currency } from "./CurrencySelector";
import QRCodeDisplay from "./QRCodeDisplay";
import SendForm from "./SendForm";

interface CryptoDepositProps {
  variant: "wallet" | "payment";
  title?: string;
  paymentAmount?: string;
  fiatAmount?: string;
  fiatCurrency?: string;
}

const walletTabs = [
  { id: "deposit", label: "Deposit" },
  { id: "send", label: "Send" },
  { id: "how-to-buy", label: "How to buy crypto" },
];

const paymentTabs = [
  { id: "deposit", label: "Pay" },
  { id: "how-to-buy", label: "How to buy crypto" },
];

const CryptoDeposit = ({
  variant,
  title,
  paymentAmount = "0.05",
  fiatAmount = "150.00",
  fiatCurrency = "USD",
}: CryptoDepositProps) => {
  const tabs = variant === "wallet" ? walletTabs : paymentTabs;
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[1]); // ETH default

  const showBalance = variant === "wallet";
  const isPaymentProcessor = variant === "payment";

  return (
    <div className="w-full max-w-sm">
      {title && <h2 className="text-lg font-semibold mb-3 text-center">{title}</h2>}
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
                fiatAmount={fiatAmount}
                fiatCurrency={fiatCurrency}
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
            <div className="space-y-5 text-sm">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-1">How to buy crypto</h3>
                <p className="text-muted-foreground">Purchase cryptocurrency using trusted payment providers.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-1">1. Choose a provider</p>
                  <p className="text-muted-foreground">
                    Use a secure third-party service to buy crypto with card or bank transfer.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="font-medium">Recommended providers</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <a href="https://swapped.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Swapped</a> — fast and simple purchases</li>
                    <li>• <a href="https://moonpay.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MoonPay</a> — cards and bank transfers</li>
                    <li>• <a href="https://transak.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Transak</a> — supports local currencies</li>
                    <li>• <a href="https://ramp.network" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ramp</a> — beginner friendly</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-1">2. Complete payment</p>
                  <p className="text-muted-foreground">
                    Follow the provider’s instructions to complete your payment securely.
                  </p>
                </div>

                <div>
                  <p className="font-medium mb-1">3. Receive your crypto</p>
                  <p className="text-muted-foreground">
                    Your crypto will be delivered directly to your wallet once confirmed.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Availability, fees, and verification may vary by provider and region.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CryptoDeposit;
