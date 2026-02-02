import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface PriceData {
  nok: number;
  nok_24h_change: number;
  nok_24h_vol: number;
  last_updated_at: number;
}

interface CryptoPricesProps {
  symbols?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const CryptoPrices = ({
  symbols = ['BTC', 'ETH', 'USDT', 'BNB'],
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
}: CryptoPricesProps) => {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPrices = async () => {
    try {
      setError("");
      const data = await apiClient.getCryptoPrices(symbols);
      setPrices(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();

    if (autoRefresh) {
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [symbols.join(','), autoRefresh, refreshInterval]);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `${price.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
    } else if (price >= 1) {
      return `${price.toFixed(4)} kr`;
    } else {
      return `${price.toFixed(6)} kr`;
    }
  };

  const formatChange = (change: number) => {
    const formatted = Math.abs(change).toFixed(2);
    return change >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) {
      return `${(vol / 1e9).toFixed(2)}B kr`;
    } else if (vol >= 1e6) {
      return `${(vol / 1e6).toFixed(2)}M kr`;
    } else if (vol >= 1e3) {
      return `${(vol / 1e3).toFixed(2)}K kr`;
    }
    return `${vol.toFixed(2)} kr`;
  };

  if (loading && !lastUpdate) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('crypto.prices')}</CardTitle>
            <CardDescription>
              {t('crypto.realTimePrices')}
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  · {t('crypto.updated')} {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPrices}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-destructive mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {symbols.map((symbol) => {
            const price = prices[symbol];
            if (!price) return null;

            const isPositive = price.nok_24h_change >= 0;

            return (
              <div
                key={symbol}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-bold">
                    {symbol}
                  </Badge>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {formatPrice(price.nok)}
                  </p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatChange(price.nok_24h_change)}
                    </span>
                    <span className="text-xs text-muted-foreground">{t('crypto.change24h')}</span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('crypto.volume24h')}: {formatVolume(price.nok_24h_vol)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoPrices;
