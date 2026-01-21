import { HelpCircle } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  externalLinks?: boolean;
}

interface DepositTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
  onSupportClick?: () => void;
  onExternalLinksClick?: () => void;
}

const DepositTabs = ({ activeTab, onTabChange, tabs, onSupportClick, onExternalLinksClick }: DepositTabsProps) => {
  const isSingleTab = tabs.length === 1;
  
  const handleTabClick = (tab: Tab) => {
    if (tab.externalLinks && onExternalLinksClick) {
      onExternalLinksClick();
    } else {
      onTabChange(tab.id);
    }
  };
  
  return (
    <div className={`flex border-b border-border ${isSingleTab ? 'justify-center' : ''}`}>
      <div className={`flex ${isSingleTab ? '' : 'flex-1'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium relative flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
              activeTab === tab.id && !tab.externalLinks
                ? tab.highlight 
                  ? 'text-primary font-semibold scale-[1.02]'
                  : 'text-foreground scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:scale-[1.01]'
            }`}
          >
            <span className={`transition-transform duration-200 ${activeTab === tab.id && !tab.externalLinks ? 'scale-110' : ''}`}>
              {tab.icon}
            </span>
            {tab.label}
            <div 
              className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-all duration-200 ease-out origin-center ${
                activeTab === tab.id && !tab.externalLinks 
                  ? 'scale-x-100 opacity-100' 
                  : 'scale-x-0 opacity-0'
              }`} 
            />
          </button>
        ))}
      </div>
      <button
        onClick={onSupportClick}
        className="px-4 py-3 text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground flex items-center gap-1.5 hover:scale-[1.02]"
      >
        <HelpCircle size={16} />
        Support
      </button>
    </div>
  );
};

export { type Tab };
export default DepositTabs;
