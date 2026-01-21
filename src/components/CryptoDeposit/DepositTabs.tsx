import { HelpCircle, ShoppingCart, History } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

interface DepositTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
  onSupportClick?: () => void;
}

const DepositTabs = ({ activeTab, onTabChange, tabs, onSupportClick }: DepositTabsProps) => {
  const isSingleTab = tabs.length === 1;
  
  return (
    <div className={`flex border-b border-border ${isSingleTab ? 'justify-center' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${
            isSingleTab ? '' : 'flex-1 text-center'
          } ${
            activeTab === tab.id
              ? tab.highlight 
                ? 'text-primary font-semibold'
                : 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.highlight ? 'bg-primary' : 'bg-primary'}`} />
          )}
        </button>
      ))}
      <button
        onClick={onSupportClick}
        className="px-4 py-3 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5"
      >
        <HelpCircle size={16} />
        Support
      </button>
    </div>
  );
};

export { type Tab };
export default DepositTabs;
