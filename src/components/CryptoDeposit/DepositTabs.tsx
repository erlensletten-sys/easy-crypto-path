import { HelpCircle } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
}

interface DepositTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

const DepositTabs = ({ activeTab, onTabChange, tabs }: DepositTabsProps) => {
  const isSingleTab = tabs.length === 1;
  
  return (
    <div className={`flex border-b border-border ${isSingleTab ? 'justify-center' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            isSingleTab ? '' : 'flex-1 text-center'
          } ${
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
      <button
        className="px-4 py-3 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5"
      >
        <HelpCircle size={16} />
        Support
      </button>
    </div>
  );
};

export default DepositTabs;
