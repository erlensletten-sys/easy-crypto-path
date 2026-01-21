import { useState } from "react";
import { ShoppingCart, ExternalLink } from "lucide-react";
import DepositTabs, { type Tab } from "./DepositTabs";
import { CurrencySelector, currencies, type Currency } from "./CurrencySelector";
import QRCodeDisplay from "./QRCodeDisplay";
import SendForm from "./SendForm";
import SupportContent from "./SupportContent";
import ConfirmPaymentButton from "./ConfirmPaymentButton";

interface CryptoDepositProps {
  variant: "wallet" | "payment";
  title?: string;
  paymentAmount?: string;
  fiatAmount?: string;
  fiatCurrency?: string;
}

const walletTabs: Tab[] = [
  { id: "deposit", label: "Deposit" },
  { id: "send", label: "Withdraw" },
  { id: "buy-crypto", label: "Buy Crypto", icon: <ExternalLink size={16} />, externalLinks: true },
];

const paymentTabs: Tab[] = [
  { id: "deposit", label: "Buy now", icon: <ShoppingCart size={16} />, highlight: true },
  { id: "buy-crypto", label: "Buy Crypto", icon: <ExternalLink size={16} />, externalLinks: true },
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
  const [showSupport, setShowSupport] = useState(false);
  const [showBuyCryptoLinks, setShowBuyCryptoLinks] = useState(false);

  const showBalance = variant === "wallet";
  const isPaymentProcessor = variant === "payment";

  const handleExternalLinksClick = () => {
    setShowBuyCryptoLinks(!showBuyCryptoLinks);
    setShowSupport(false);
  };

  const handleSupportClick = () => {
    setShowSupport(!showSupport);
    setShowBuyCryptoLinks(false);
  };

  return (
    <div className="w-full max-w-sm">
      {title && <h2 className="text-lg font-semibold mb-3 text-center">{title}</h2>}
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <DepositTabs 
          activeTab={activeTab} 
          onTabChange={(tabId) => {
            setActiveTab(tabId);
            setShowBuyCryptoLinks(false);
            setShowSupport(false);
          }} 
          tabs={tabs}
          onSupportClick={handleSupportClick}
          onExternalLinksClick={handleExternalLinksClick}
        />

        <div className="p-4">
          {showSupport ? (
            <SupportContent onClose={() => setShowSupport(false)} />
          ) : showBuyCryptoLinks ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-4">Purchase cryptocurrency using trusted payment providers</p>
              </div>
              <div className="space-y-2">
                <a 
                  href="https://swapped.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">Swapped</p>
                    <p className="text-xs text-muted-foreground">Fast and simple</p>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground" />
                </a>
                <a 
                  href="https://moonpay.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">MoonPay</p>
                    <p className="text-xs text-muted-foreground">Cards & bank transfers</p>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground" />
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Availability, fees, and verification may vary by provider and region.
              </p>
            </div>
          ) : (
            <>
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
                  
                  {isPaymentProcessor && (
                    <div className="mt-4">
                      <ConfirmPaymentButton 
                        cryptoId={selectedCurrency.id}
                        onConfirmed={() => {
                          // TODO: Handle successful confirmation
                          console.log('Payment confirmed!');
                        }}
                      />
                    </div>
                  )}
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
            </>
          )}
        </div>

        {/* How to buy crypto - discrete link at bottom */}
        <button
          onClick={() => setActiveTab(activeTab === "how-to-buy" ? tabs[0].id : "how-to-buy")}
          className="w-full py-3 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to buy crypto
        </button>

        {/* How to buy content - collapsible */}
        {activeTab === "how-to-buy" && (
          <div className="p-4 border-t border-border bg-muted/20">
            <div className="space-y-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Purchase cryptocurrency using trusted payment providers.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-medium text-xs mb-1">1. Choose a provider</p>
                  <p className="text-muted-foreground text-xs">
                    Use a secure third-party service to buy crypto with card or bank transfer.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
                  <p className="font-medium text-xs">Recommended providers</p>
                  <ul className="space-y-0.5 text-muted-foreground text-xs">
                    <li>• <a href="https://swapped.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Swapped</a> — fast and simple</li>
                    <li>• <a href="https://moonpay.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MoonPay</a> — cards & transfers</li>
                    <li>• <a href="https://transak.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Transak</a> — local currencies</li>
                    <li>• <a href="https://ramp.network" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ramp</a> — beginner friendly</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-xs mb-1">2. Complete payment</p>
                  <p className="text-muted-foreground text-xs">
                    Follow the provider's instructions to complete your payment securely.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-xs mb-1">3. Receive your crypto</p>
                  <p className="text-muted-foreground text-xs">
                    Your crypto will be delivered directly to your wallet once confirmed.
                  </p>
                </div>

                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  Availability, fees, and verification may vary by provider and region.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoDeposit;
