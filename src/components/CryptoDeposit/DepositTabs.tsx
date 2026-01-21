interface Tab {
  id: string;
  label: string;
}

const tabs: Tab[] = [
  { id: "deposit", label: "Deposit" },
  { id: "how-to-buy", label: "How to buy crypto" },
  { id: "tip", label: "Tip" },
];

interface DepositTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const DepositTabs = ({ activeTab, onTabChange }: DepositTabsProps) => {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === tab.id
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
};

export default DepositTabs;
