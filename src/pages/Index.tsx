import CryptoDeposit from "@/components/CryptoDeposit";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
        <CryptoDeposit variant="wallet" title="Wallet" />
        <CryptoDeposit variant="payment" title="Payment Processor" />
      </div>
    </div>
  );
};

export default Index;
