import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'db', 'crypto.db');

const db = new Database(dbPath);

// Reset admin's PGP status
db.prepare('UPDATE users SET pgp_public_key = NULL, pgp_enabled = 0 WHERE username = ?').run('admin');

// Clear all sessions
db.prepare('DELETE FROM sessions WHERE user_id = 2').run();

// Clear any PGP challenges
db.prepare('DELETE FROM pgp_challenges WHERE user_id = 2').run();

console.log('✅ Admin PGP status reset');
console.log('✅ Admin sessions cleared');
console.log('✅ Admin PGP challenges cleared');

const admin = db.prepare('SELECT username, pgp_enabled FROM users WHERE username = ?').get('admin');
console.log('Admin status:', admin);

db.close();
