# Cryptocurrency Wallet & Price Features

## Summary

Two major cryptocurrency features have been implemented:

1. ✅ **Admin Wallet Management** - Configure wallet addresses and xPub keys
2. ✅ **Proxied Price API** - Real-time crypto prices without exposing IP

---

## 1. Wallet Management System

### Database Schema

**New Table: `wallets`**
```sql
CREATE TABLE wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crypto_id TEXT NOT NULL,        -- e.g., 'btc', 'eth', 'usdt'
  type TEXT NOT NULL,              -- 'address' or 'xpub'
  value TEXT NOT NULL,             -- wallet address or xpub key
  label TEXT,                      -- optional label
  is_active INTEGER DEFAULT 1,    -- enable/disable wallet
  created_at DATETIME,
  updated_at DATETIME
);
```

**Indexes:**
- `idx_wallets_crypto` on crypto_id
- `idx_wallets_active` on is_active
- `idx_wallets_type` on type

### Backend API Endpoints

All endpoints require **admin authentication**.

#### Get All Wallets
```
GET /api/wallets
Authorization: Bearer {admin_token}
```

**Response:**
```json
[
  {
    "id": 1,
    "crypto_id": "btc",
    "type": "address",
    "value": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "label": "Main BTC Wallet",
    "is_active": 1,
    "created_at": "2026-02-02 18:02:09",
    "updated_at": "2026-02-02 18:02:09"
  }
]
```

#### Get Wallets by Crypto
```
GET /api/wallets/{cryptoId}
Authorization: Bearer {admin_token}
```

Returns only active wallets for specified cryptocurrency.

#### Create Wallet
```
POST /api/wallets
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "crypto_id": "btc",
  "type": "address",
  "value": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "label": "Main BTC Wallet"
}
```

**Validation:**
- `type` must be "address" or "xpub"
- All required fields must be present

#### Update Wallet
```
PUT /api/wallets/{id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "is_active": 0,
  "label": "Old wallet - deprecated"
}
```

#### Delete Wallet
```
DELETE /api/wallets/{id}
Authorization: Bearer {admin_token}
```

### Frontend: Wallet Management Page

**Route:** `/wallets` (Admin only)

**Features:**
- ✅ View all configured wallets
- ✅ Add new wallet addresses or xPub keys
- ✅ Edit existing wallets
- ✅ Toggle active/inactive status
- ✅ Delete wallets
- ✅ Copy addresses to clipboard
- ✅ Cryptocurrency selector (BTC, ETH, etc.)
- ✅ Type selector (Address or xPub)
- ✅ Optional labels for organization

**UI Components:**
- Table view with all wallet details
- Add/Edit dialog with form validation
- Copy button for easy address copying
- Status toggle (active/inactive)
- Cryptocurrency badges
- Type badges (address vs xpub)

**Security Note Displayed:**
> Only add wallet addresses you control. Never share private keys or seed phrases.
> xPub keys allow generating receive addresses without exposing private keys.

---

## 2. Proxied Cryptocurrency Price API

### Why Proxied?

**Privacy Protection:**
- Client never connects directly to external APIs
- Server's IP is exposed, not user's IP
- All requests go through backend proxy
- No IP leakage to third-party services

### Backend Implementation

#### Get Crypto Prices
```
GET /api/crypto/prices?symbols=btc,eth,usdt
```

**No authentication required** - public endpoint

**Response:**
```json
{
  "BTC": {
    "usd": 78943.00,
    "usd_24h_change": 1.6048554295676105,
    "usd_24h_vol": 92722648164.42691,
    "last_updated_at": 1770055210
  },
  "ETH": {
    "usd": 2353.46,
    "usd_24h_change": 2.018466181267343,
    "usd_24h_vol": 58613617138.27848,
    "last_updated_at": 1770055210
  }
}
```

**How It Works:**
1. Frontend requests: `GET /api/crypto/prices?symbols=btc,eth`
2. Backend proxies to CoinGecko API
3. Backend transforms response to our format
4. Returns prices to frontend
5. **User's IP never touches CoinGecko**

#### Get Supported Cryptocurrencies
```
GET /api/crypto/supported
```

**Response:**
```json
[
  {
    "symbol": "BTC",
    "name": "Bitcoin",
    "coinGeckoId": "bitcoin"
  },
  {
    "symbol": "ETH",
    "name": "Ethereum",
    "coinGeckoId": "ethereum"
  }
]
```

**Supported Cryptocurrencies:**
- Bitcoin (BTC)
- Ethereum (ETH)
- Tether (USDT)
- USD Coin (USDC)
- Binance Coin (BNB)
- Ripple (XRP)
- Cardano (ADA)
- Dogecoin (DOGE)
- Solana (SOL)
- Litecoin (LTC)
- Tron (TRX)
- Polygon (MATIC)

### Frontend Component: CryptoPrices

**Location:** `src/components/CryptoPrices.tsx`

**Features:**
- ✅ Real-time price display
- ✅ 24-hour price change percentage
- ✅ 24-hour trading volume
- ✅ Color-coded trends (green/red)
- ✅ Auto-refresh (configurable interval)
- ✅ Manual refresh button
- ✅ Last update timestamp
- ✅ Responsive grid layout

**Usage:**
```tsx
import CryptoPrices from '@/components/CryptoPrices';

<CryptoPrices
  symbols={['BTC', 'ETH', 'USDT', 'BNB']}
  autoRefresh={true}
  refreshInterval={60000}  // 1 minute
/>
```

**Props:**
- `symbols`: Array of crypto symbols to display
- `autoRefresh`: Enable/disable auto-refresh
- `refreshInterval`: Refresh interval in milliseconds

**Display Format:**
- Prices: $78,943.00 (formatted with commas)
- Change: +1.60% or -1.60% (with color)
- Volume: $92.7B (formatted with K/M/B suffixes)
- Trend icons: ↗ (green) or ↘ (red)

---

## Files Modified/Created

### Backend

**Modified:**
- ✅ `server/server.js`
  - Added wallet CRUD endpoints
  - Added crypto price proxy endpoint
  - Added supported cryptos endpoint

**Created:**
- ✅ `server/add-wallets-table.js`
  - Database migration script for wallets table

### Frontend

**Modified:**
- ✅ `src/lib/api.ts`
  - Added wallet management methods
  - Added crypto price methods

- ✅ `src/App.tsx`
  - Added `/wallets` route

- ✅ `src/pages/Dashboard.tsx`
  - Added "Wallets" quick action card (admin only)
  - Changed grid back to 3 columns

**Created:**
- ✅ `src/pages/WalletManagement.tsx`
  - Full wallet management interface

- ✅ `src/components/CryptoPrices.tsx`
  - Reusable price display component

---

## Testing

### Test Wallet Management

```bash
# 1. Login as admin
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"testadmin123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Create wallet
curl -X POST http://localhost:3001/api/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "crypto_id": "btc",
    "type": "address",
    "value": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "label": "Main BTC Wallet"
  }'

# 3. Get all wallets
curl -X GET http://localhost:3001/api/wallets \
  -H "Authorization: Bearer $TOKEN"

# 4. Get BTC wallets only
curl -X GET http://localhost:3001/api/wallets/btc \
  -H "Authorization: Bearer $TOKEN"

# 5. Update wallet
curl -X PUT http://localhost:3001/api/wallets/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": 0}'

# 6. Delete wallet
curl -X DELETE http://localhost:3001/api/wallets/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Test Price API

```bash
# Get BTC and ETH prices (no auth required)
curl "http://localhost:3001/api/crypto/prices?symbols=btc,eth"

# Get supported cryptos
curl "http://localhost:3001/api/crypto/supported"

# Get multiple prices
curl "http://localhost:3001/api/crypto/prices?symbols=btc,eth,usdt,bnb,doge"
```

### Test in Browser

1. **Admin - Wallet Management:**
   - Login as admin
   - Go to Dashboard → Wallets
   - Click "Add Wallet"
   - Select cryptocurrency (e.g., BTC)
   - Select type (Address or xPub)
   - Paste wallet address
   - Add optional label
   - Click "Add Wallet"
   - View in table
   - Test copy button
   - Toggle active/inactive
   - Edit or delete

2. **Price Display:**
   - Add CryptoPrices component to any page
   - See real-time prices
   - Watch auto-refresh
   - Click manual refresh button

---

## Security Features

### Wallet Management

1. **Admin-Only Access:**
   - All wallet endpoints require admin authentication
   - Regular users cannot view or modify wallets

2. **No Private Keys:**
   - System only stores public addresses
   - Never stores private keys or seed phrases
   - xPub keys allow address generation without exposing private keys

3. **Active/Inactive Status:**
   - Disable wallets without deleting
   - Historical record maintained

### Price API Proxy

1. **IP Privacy:**
   - Client IP never exposed to CoinGecko
   - All requests proxied through backend
   - Server IP is exposed (acceptable)

2. **No API Keys Required:**
   - Using CoinGecko free tier
   - No rate limiting concerns for reasonable usage

3. **Public Endpoint:**
   - Price data is public information
   - No authentication required
   - Can be cached if needed

---

## Use Cases

### Wallet Management

**Use Case 1: Single Address per Crypto**
- Admin adds one BTC address
- All payments go to this address
- Simple setup for small operations

**Use Case 2: xPub for HD Wallets**
- Admin adds xPub key
- System can generate unique addresses per order
- Better privacy and organization
- Common for larger operations

**Use Case 3: Multiple Wallets**
- Admin adds multiple addresses per crypto
- Can rotate between them
- Label as "Hot Wallet", "Cold Storage", etc.
- Disable old wallets without deleting

### Price Display

**Use Case 1: Checkout Pages**
- Show current crypto prices
- Calculate order total in crypto
- Update in real-time

**Use Case 2: Dashboard Widgets**
- Admin sees market overview
- Monitor crypto holdings value
- Quick reference for pricing

**Use Case 3: Public Product Pages**
- Show crypto prices to visitors
- Help users understand payment amounts
- No IP tracking or privacy concerns

---

## API Rate Limits

### CoinGecko Free Tier

- **Rate Limit:** 10-50 calls/minute
- **Current Usage:** 1 call per refresh
- **Recommended:** Cache for 30-60 seconds
- **Auto-refresh:** Set to 60 seconds by default

### Optimization Strategies

1. **Frontend Caching:**
   - Cache prices for 30-60 seconds
   - Reduce redundant API calls

2. **Backend Caching:**
   - Implement Redis or in-memory cache
   - Serve cached data for 30-60 seconds
   - Reduce CoinGecko API calls

3. **Batch Requests:**
   - Request multiple symbols at once
   - Single API call for all prices

---

## Future Enhancements

### Wallet Management

1. **Address Derivation:**
   - Implement xPub → address derivation
   - Generate unique addresses per order
   - Track derivation index

2. **QR Code Generation:**
   - Generate QR codes for addresses
   - Easy mobile wallet scanning

3. **Address Validation:**
   - Validate address format per crypto
   - Prevent invalid addresses

4. **Webhook Integration:**
   - Monitor addresses for incoming payments
   - Automatic payment verification

### Price API

1. **Historical Data:**
   - Price charts
   - Historical price queries
   - Trend analysis

2. **Multiple Currencies:**
   - EUR, GBP, JPY prices
   - User-selectable currency

3. **Price Alerts:**
   - Admin-configured thresholds
   - Email/notification on large changes

4. **Alternative APIs:**
   - Add fallback to other price sources
   - CoinMarketCap, Binance, etc.

---

## Deployment Considerations

### Production Setup

1. **Environment Variables:**
```env
# Optional: Add CoinGecko API key for higher limits
COINGECKO_API_KEY=your_api_key_here

# Cache duration (seconds)
PRICE_CACHE_DURATION=60
```

2. **Caching Layer:**
```javascript
// Recommended: Add Redis for price caching
import Redis from 'redis';

const cache = Redis.createClient();
const CACHE_TTL = 60; // seconds

app.get('/api/crypto/prices', async (req, res) => {
  const cacheKey = `prices:${req.query.symbols}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  // Fetch and cache
  const prices = await fetchPrices(req.query.symbols);
  await cache.setex(cacheKey, CACHE_TTL, JSON.stringify(prices));
  res.json(prices);
});
```

3. **Monitoring:**
   - Monitor CoinGecko API usage
   - Alert on rate limit issues
   - Track API response times

---

## Summary

✅ **Wallet Management:** Fully functional admin interface for managing crypto addresses and xPubs
✅ **Price API:** Proxied real-time prices protecting user privacy
✅ **Security:** Admin-only wallet access, no private key storage, IP privacy protection
✅ **Testing:** All endpoints tested and working
✅ **Build:** Frontend compiled successfully (463KB)

**Status:** Ready for use! 🚀

All features are implemented, tested, and production-ready.
