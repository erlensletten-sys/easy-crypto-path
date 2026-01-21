import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, Mail, ExternalLink } from "lucide-react";

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SupportModal = ({ open, onOpenChange }: SupportModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Need Help?</DialogTitle>
          <DialogDescription>
            Choose how you'd like to get support
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          <a
            href="#"
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <MessageCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Live Chat</p>
              <p className="text-xs text-muted-foreground">Chat with our support team</p>
            </div>
            <ExternalLink size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
          
          <a
            href="mailto:support@example.com"
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Email Support</p>
              <p className="text-xs text-muted-foreground">support@example.com</p>
            </div>
            <ExternalLink size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
          
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              Average response time: under 24 hours
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportModal;
