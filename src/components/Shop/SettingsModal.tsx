import { useState, useEffect } from 'react';
import { Settings, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface ShopSettings {
  javascriptEnabled: boolean;
  onionAddress: string;
}

const SETTINGS_KEY = 'shop-settings';

function getStoredSettings(): ShopSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse settings:', e);
  }
  return {
    javascriptEnabled: true,
    onionAddress: '',
  };
}

function saveSettings(settings: ShopSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ShopSettings>(getStoredSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleJsToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, javascriptEnabled: enabled }));
    if (!enabled) {
      // Show a message that this is a preference indicator
      // In a real implementation, this could trigger a static HTML mode
    }
  };

  const handleOnionChange = (value: string) => {
    setSettings((prev) => ({ ...prev, onionAddress: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shop Settings</DialogTitle>
          <DialogDescription>
            Configure your privacy and accessibility preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="js-toggle" className="text-base">
                JavaScript Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.javascriptEnabled 
                  ? 'Enhanced experience with JavaScript' 
                  : 'Prefer static HTML (limited features)'}
              </p>
            </div>
            <Switch
              id="js-toggle"
              checked={settings.javascriptEnabled}
              onCheckedChange={handleJsToggle}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="onion-address" className="text-base">
                Onion Address
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a .onion address for Tor network access.
            </p>
            <Input
              id="onion-address"
              placeholder="example.onion"
              value={settings.onionAddress}
              onChange={(e) => handleOnionChange(e.target.value)}
              className="font-mono text-sm"
            />
            {settings.onionAddress && (
              <p className="text-xs text-muted-foreground">
                Access via Tor: <span className="font-mono">{settings.onionAddress}</span>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
