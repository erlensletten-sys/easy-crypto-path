import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'db', 'crypto.db');

console.log('Initializing database...');

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    pgp_public_key TEXT,
    pgp_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS pgp_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_string TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    crypto_id TEXT NOT NULL,
    amount REAL NOT NULL,
    address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    confirmations INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    category TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_email TEXT,
    customer_name TEXT,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_tx_hash TEXT,
    shipping_address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_session_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_session_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_session_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_pgp_challenges_user ON pgp_challenges(user_id);
  CREATE INDEX IF NOT EXISTS idx_pgp_challenges_expires ON pgp_challenges(expires_at);
  CREATE INDEX IF NOT EXISTS idx_product_active ON products(is_active);
  CREATE INDEX IF NOT EXISTS idx_order_number ON orders(order_number);
  CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`);

// Check if admin exists
const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');

if (adminExists.count === 0) {
  console.log('Creating default admin user...');

  // Default admin credentials
  const defaultUsername = 'admin';
  const defaultPassword = 'admin123'; // User should change this immediately
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  db.prepare(`
    INSERT INTO users (username, password_hash, email, role)
    VALUES (?, ?, ?, ?)
  `).run(defaultUsername, passwordHash, 'admin@localhost', 'admin');

  console.log('✅ Default admin created:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
} else {
  console.log('✅ Admin user already exists');
}

// Clean up expired sessions and challenges
db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
db.prepare("DELETE FROM pgp_challenges WHERE expires_at < datetime('now')").run();

console.log('✅ Database initialized successfully!');
db.close();
