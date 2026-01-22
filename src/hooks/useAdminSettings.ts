import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CurrencySettings {
  enabled: string[];
  default: string;
}

interface LanguageSettings {
  default: string;
  available: string[];
}

export function useAdminSettings() {
  const [currencies, setCurrencies] = useState<CurrencySettings>({
    enabled: ['USD', 'EUR', 'BTC', 'ETH'],
    default: 'USD',
  });
  const [language, setLanguage] = useState<LanguageSettings>({
    default: 'en',
    available: ['en', 'es', 'fr', 'de', 'zh'],
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.key === 'currencies') {
          setCurrencies(setting.value as unknown as CurrencySettings);
        } else if (setting.key === 'language') {
          setLanguage(setting.value as unknown as LanguageSettings);
        }
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrencies = async (newCurrencies: CurrencySettings) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: JSON.parse(JSON.stringify(newCurrencies)) })
        .eq('key', 'currencies');

      if (error) throw error;

      setCurrencies(newCurrencies);
      toast.success('Currency settings updated');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update currencies');
      return { error };
    }
  };

  const updateLanguage = async (newLanguage: LanguageSettings) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: JSON.parse(JSON.stringify(newLanguage)) })
        .eq('key', 'language');

      if (error) throw error;

      setLanguage(newLanguage);
      toast.success('Language settings updated');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update language');
      return { error };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    currencies,
    language,
    loading,
    updateCurrencies,
    updateLanguage,
    refreshSettings: fetchSettings,
  };
}
