import { useState, useEffect } from "react";

import DepositTabs, { type Tab } from "./DepositTabs";
import { CurrencySelector, currencies, type Currency } from "./CurrencySelector";
import QRCodeDisplay from "./QRCodeDisplay";
import SendForm from "./SendForm";
import SupportContent from "./SupportContent";
import { Skeleton } from "@/components/ui/skeleton";

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
  { id: "buy-crypto", label: "Buy Crypto", externalLinks: true },
];

const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="flex justify-center py-4">
      <Skeleton className="h-40 w-40 rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-24 mx-auto" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  </div>
);

const CryptoDeposit = ({
  variant,
  title,
  paymentAmount = "0.05",
  fiatAmount = "150.00",
  fiatCurrency = "USD",
}: CryptoDepositProps) => {
  const tabs = walletTabs;
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[1]);
  const [showSupport, setShowSupport] = useState(false);
  const [showBuyCryptoLinks, setShowBuyCryptoLinks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showBalance = true;

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setIsLoading(true);
    setActiveTab(tabId);
    setShowBuyCryptoLinks(false);
    setShowSupport(false);
  };

  const handleExternalLinksClick = () => {
    setIsLoading(true);
    setShowBuyCryptoLinks(!showBuyCryptoLinks);
    setShowSupport(false);
  };

  const handleSupportClick = () => {
    setIsLoading(true);
    setShowSupport(!showSupport);
    setShowBuyCryptoLinks(false);
  };

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activeTab, showSupport, showBuyCryptoLinks]);

  return (
    <div className="w-full max-w-sm">
      {title && <h2 className="text-lg font-semibold mb-3 text-center">{title}</h2>}
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <DepositTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          tabs={tabs}
          onExternalLinksClick={handleExternalLinksClick}
        />

        <div className="p-4 min-h-[320px]">
          {isLoading ? (
            <ContentSkeleton />
          ) : (
            <>
              <div className={`transition-all duration-200 ease-out ${showSupport ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <SupportContent onClose={() => setShowSupport(false)} />
              </div>
              <div className={`transition-all duration-200 ease-out ${showBuyCryptoLinks && !showSupport ? 'opacity-100' : 'opacity-0 hidden'}`}>
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
                    </a>
                    <a 
                      href="https://transak.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">Transak</p>
                        <p className="text-xs text-muted-foreground">Local payment methods</p>
                      </div>
                    </a>
                    <a 
                      href="https://ramp.network" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">Ramp Network</p>
                        <p className="text-xs text-muted-foreground">Beginner friendly</p>
                      </div>
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Availability, fees, and verification may vary by provider and region.
                  </p>
                </div>
              </div>
              <div className={`transition-all duration-200 ease-out ${!showSupport && !showBuyCryptoLinks ? 'opacity-100' : 'opacity-0 hidden'}`}>
                {activeTab === "deposit" && (
                  <>
                    <CurrencySelector
                      selectedCurrency={selectedCurrency}
                      onSelect={setSelectedCurrency}
                      showBalance={showBalance}
                    />
                    <QRCodeDisplay
                      currency={selectedCurrency}
                      showAmount={false}
                      amount={paymentAmount}
                      fiatAmount={fiatAmount}
                      fiatCurrency={fiatCurrency}
                    />
                  </>
                )}

                {activeTab === "send" && (
                  <>
                    <CurrencySelector
                      selectedCurrency={selectedCurrency}
                      onSelect={setSelectedCurrency}
                      showBalance={showBalance}
                    />
                    <SendForm currency={selectedCurrency} />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Support - discrete link at bottom */}
        <button
          onClick={handleSupportClick}
          className="w-full py-3 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Support
        </button>
      </div>
    </div>
  );
};

export default CryptoDeposit;
