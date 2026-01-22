import { useState } from 'react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Globe, Coins, RefreshCw } from 'lucide-react';

const ALL_CURRENCIES = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'USDC', 'XMR', 'LTC', 'SOL'];
const ALL_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
];

export function AdminSettings() {
  const { currencies, language, loading, updateCurrencies, updateLanguage, refreshSettings } =
    useAdminSettings();
  const [saving, setSaving] = useState(false);

  const toggleCurrency = async (currency: string) => {
    setSaving(true);
    const newEnabled = currencies.enabled.includes(currency)
      ? currencies.enabled.filter((c) => c !== currency)
      : [...currencies.enabled, currency];

    // If removing the default currency, set a new default
    const newDefault = !newEnabled.includes(currencies.default)
      ? newEnabled[0] || 'USD'
      : currencies.default;

    await updateCurrencies({ enabled: newEnabled, default: newDefault });
    setSaving(false);
  };

  const setDefaultCurrency = async (currency: string) => {
    setSaving(true);
    await updateCurrencies({ ...currencies, default: currency });
    setSaving(false);
  };

  const toggleLanguage = async (langCode: string) => {
    setSaving(true);
    const newAvailable = language.available.includes(langCode)
      ? language.available.filter((l) => l !== langCode)
      : [...language.available, langCode];

    // If removing the default language, set a new default
    const newDefault = !newAvailable.includes(language.default)
      ? newAvailable[0] || 'en'
      : language.default;

    await updateLanguage({ available: newAvailable, default: newDefault });
    setSaving(false);
  };

  const setDefaultLanguage = async (langCode: string) => {
    setSaving(true);
    await updateLanguage({ ...language, default: langCode });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Global Settings</h2>
        </div>
        <Button variant="outline" onClick={refreshSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <CardTitle>Currency Settings</CardTitle>
          </div>
          <CardDescription>
            Enable or disable currencies and set the default currency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-4 block">Default Currency</Label>
            <Select
              value={currencies.default}
              onValueChange={setDefaultCurrency}
              disabled={saving}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.enabled.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-4 block">Enabled Currencies</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {ALL_CURRENCIES.map((currency) => (
                <div
                  key={currency}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{currency}</span>
                  <Switch
                    checked={currencies.enabled.includes(currency)}
                    onCheckedChange={() => toggleCurrency(currency)}
                    disabled={saving || (currencies.enabled.length === 1 && currencies.enabled.includes(currency))}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Language Settings</CardTitle>
          </div>
          <CardDescription>
            Configure available languages and set the default language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-4 block">Default Language</Label>
            <Select
              value={language.default}
              onValueChange={setDefaultLanguage}
              disabled={saving}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {language.available.map((langCode) => {
                  const lang = ALL_LANGUAGES.find((l) => l.code === langCode);
                  return (
                    <SelectItem key={langCode} value={langCode}>
                      {lang?.name || langCode}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-4 block">Available Languages</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {ALL_LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{lang.name}</span>
                  <Switch
                    checked={language.available.includes(lang.code)}
                    onCheckedChange={() => toggleLanguage(lang.code)}
                    disabled={saving || (language.available.length === 1 && language.available.includes(lang.code))}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
