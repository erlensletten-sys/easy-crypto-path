import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'db', 'crypto.db');

console.log('Starting database migration...');
console.log(`Database path: ${dbPath}`);

const db = new Database(dbPath);

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  console.log('1. Creating users table from admins...');

  // Create users table with new structure
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      pgp_public_key TEXT,
      pgp_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Migrate existing admin data
  console.log('2. Migrating existing admin data...');
  db.exec(`
    INSERT INTO users (id, username, password_hash, email, role, pgp_enabled, created_at, last_login)
    SELECT id, username, password_hash, email, 'admin', 0, created_at, last_login
    FROM admins
  `);

  // Drop old admins table
  console.log('3. Dropping old admins table...');
  db.exec('DROP TABLE admins');

  // Create PGP challenges table
  console.log('4. Creating pgp_challenges table...');
  db.exec(`
    CREATE TABLE pgp_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      challenge_string TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for users table
  console.log('5. Creating indexes for users table...');
  db.exec(`
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_username ON users(username);
    CREATE INDEX idx_users_email ON users(email);
  `);

  // Create indexes for pgp_challenges table
  console.log('6. Creating indexes for pgp_challenges table...');
  db.exec(`
    CREATE INDEX idx_pgp_challenges_user ON pgp_challenges(user_id);
    CREATE INDEX idx_pgp_challenges_expires ON pgp_challenges(expires_at);
  `);

  // Migrate sessions table
  console.log('7. Creating new sessions table...');
  db.exec(`
    CREATE TABLE sessions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('8. Migrating session data...');
  db.exec(`
    INSERT INTO sessions_new (id, user_id, token, expires_at, created_at)
    SELECT id, admin_id, token, expires_at, created_at FROM sessions
  `);

  console.log('9. Replacing sessions table...');
  db.exec('DROP TABLE sessions');
  db.exec('ALTER TABLE sessions_new RENAME TO sessions');

  console.log('10. Creating indexes for sessions table...');
  db.exec(`
    CREATE INDEX idx_session_token ON sessions(token);
    CREATE INDEX idx_session_expires ON sessions(expires_at);
    CREATE INDEX idx_session_user ON sessions(user_id);
  `);

  // Commit transaction
  db.exec('COMMIT');

  console.log('✅ Migration completed successfully!');

  // Verify migration
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "admin"').get();
  console.log(`   Total users: ${userCount.count}`);
  console.log(`   Admins: ${adminCount.count}`);

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  console.log('Database rolled back to previous state.');
  process.exit(1);
} finally {
  db.close();
}
