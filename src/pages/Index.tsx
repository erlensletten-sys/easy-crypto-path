import CryptoDeposit from "@/components/CryptoDeposit";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row items-center justify-center gap-8 p-6">
      <CryptoDeposit variant="wallet" title="Wallet" />
      <CryptoDeposit variant="payment" title="Payment Processor" />
    </div>
  );
};

export default Index;
