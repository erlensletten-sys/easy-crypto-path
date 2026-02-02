import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'db', 'crypto.db');

console.log('Adding wallets table...');

const db = new Database(dbPath);

try {
  db.exec('BEGIN TRANSACTION');

  // Create wallets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crypto_id TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      label TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_wallets_crypto ON wallets(crypto_id);
    CREATE INDEX IF NOT EXISTS idx_wallets_active ON wallets(is_active);
    CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);
  `);

  db.exec('COMMIT');

  console.log('✅ Wallets table created successfully!');

  // Check if table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wallets'").get();
  console.log('Verification:', tables ? '✅ Table exists' : '❌ Table not found');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}
