import { MessageCircle, Mail, ExternalLink, X } from "lucide-react";

interface SupportContentProps {
  onClose: () => void;
}

const SupportContent = ({ onClose }: SupportContentProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Need Help?</p>
          <p className="text-xs text-muted-foreground">Choose how you'd like to get support</p>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-2 pt-2">
        <a
          href="#"
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
        >
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <MessageCircle size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Live Chat</p>
            <p className="text-xs text-muted-foreground">Chat with our support team</p>
          </div>
          <ExternalLink size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
        
        <a
          href="mailto:support@example.com"
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
        >
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Mail size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Email Support</p>
            <p className="text-xs text-muted-foreground">support@example.com</p>
          </div>
          <ExternalLink size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
        
        <div className="pt-1 text-center">
          <p className="text-[10px] text-muted-foreground">
            Average response time: under 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportContent;
