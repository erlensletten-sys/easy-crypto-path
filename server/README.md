# Easy Crypto Path - Self-Hosted Backend

This is a bulletproof self-hosted backend using SQLite3 and Express.js.

## Features

- ✅ **SQLite Database** - Reliable, self-contained database
- ✅ **Admin Authentication** - Secure JWT-based auth with bcrypt password hashing
- ✅ **Transaction Management** - Track cryptocurrency transactions
- ✅ **Rate Limiting** - Protect against brute force attacks
- ✅ **CORS & Helmet** - Security best practices
- ✅ **WAL Mode** - Better concurrency for SQLite

## Installation

```bash
cd server
npm install
```

## Initialize Database

This will create the SQLite database and default admin user:

```bash
npm run init-db
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **CHANGE THE DEFAULT PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server runs on port 3001 by default.

## Configuration

Edit `server/.env` to configure:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-change-in-production-please
```

⚠️ **IMPORTANT**: Change the JWT_SECRET in production!

## API Endpoints

### Authentication

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout (requires auth)
- `POST /api/auth/change-password` - Change admin password (requires auth)

### Transactions

- `GET /api/transactions` - Get all transactions (requires auth)
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:txHash` - Get transaction by hash
- `PATCH /api/transactions/:txHash` - Update transaction status

### Health Check

- `GET /api/health` - Server health check

## Database Schema

### admins
```sql
id              INTEGER PRIMARY KEY
username        TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
email           TEXT UNIQUE
created_at      DATETIME
last_login      DATETIME
```

### transactions
```sql
id              INTEGER PRIMARY KEY
tx_hash         TEXT UNIQUE NOT NULL
crypto_id       TEXT NOT NULL
amount          REAL NOT NULL
address         TEXT NOT NULL
status          TEXT DEFAULT 'pending'
confirmations   INTEGER DEFAULT 0
created_at      DATETIME
updated_at      DATETIME
```

### sessions
```sql
id              INTEGER PRIMARY KEY
admin_id        INTEGER (FK to admins)
token           TEXT UNIQUE NOT NULL
expires_at      DATETIME NOT NULL
created_at      DATETIME
```

## Security Features

1. **Password Hashing** - bcrypt with 10 rounds
2. **JWT Tokens** - 24-hour expiration
3. **Rate Limiting** - 5 login attempts per 15 minutes
4. **CORS Protection** - Only allows configured frontend origin
5. **Helmet.js** - Security headers
6. **Session Management** - Automatic cleanup of expired sessions

## Resetting Admin Password

### Method 1: Via Admin Dashboard
1. Login to admin dashboard at `/admin`
2. Click "Change Password"
3. Enter current and new password

### Method 2: Direct Database Access
```bash
cd server
node
```

```javascript
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./db/crypto.db');
const newPassword = 'your-new-password';
const hash = bcrypt.hashSync(newPassword, 10);

db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?')
  .run(hash, 'admin');

console.log('Password reset successfully!');
db.close();
```

### Method 3: Reinitialize Database (⚠️ DELETES ALL DATA)
```bash
rm db/crypto.db
npm run init-db
```

## Production Deployment

1. Change JWT_SECRET in `.env`
2. Change default admin password immediately
3. Use a process manager (PM2, systemd)
4. Set up HTTPS/reverse proxy (nginx, caddy)
5. Regular database backups

### Example PM2 Setup
```bash
npm install -g pm2
pm2 start server.js --name crypto-backend
pm2 save
pm2 startup
```

## Database Backup

SQLite makes backups easy:

```bash
# Backup
cp server/db/crypto.db server/db/crypto.db.backup

# Restore
cp server/db/crypto.db.backup server/db/crypto.db
```

## Troubleshooting

### Port Already in Use
Change PORT in `.env` file

### Database Locked
SQLite uses WAL mode for better concurrency. If you still experience locks:
- Ensure only one server instance is running
- Check file permissions on `db/` directory

### Authentication Errors
- Verify JWT_SECRET matches between restarts
- Check session hasn't expired (24h default)
- Clear browser localStorage and login again

## License

MIT
