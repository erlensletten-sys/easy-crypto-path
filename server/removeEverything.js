import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'db', 'crypto.db');

console.log('🗑️  Removing ALL data from database...');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

try {
  // Count records before deletion
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;

  console.log('\n📊 Current data:');
  console.log(`   Admins: ${adminCount}`);
  console.log(`   Transactions: ${txCount}`);
  console.log(`   Orders: ${orderCount}`);
  console.log(`   Products: ${productCount}`);
  console.log(`   Active sessions: ${sessionCount}`);

  // Delete all data including admins
  console.log('\n🧹 Removing everything...');

  db.prepare('DELETE FROM order_items').run();
  console.log('   ✓ Order items removed');

  db.prepare('DELETE FROM orders').run();
  console.log('   ✓ Orders removed');

  db.prepare('DELETE FROM products').run();
  console.log('   ✓ Products removed');

  db.prepare('DELETE FROM transactions').run();
  console.log('   ✓ Transactions removed');

  db.prepare('DELETE FROM sessions').run();
  console.log('   ✓ Sessions removed');

  db.prepare('DELETE FROM admins').run();
  console.log('   ✓ Admin accounts removed');

  console.log('\n✅ Everything removed successfully!');
  console.log('   Database is now completely empty.');
  console.log('   ⚠️  Run "node initDb.js" to recreate admin account.');

} catch (error) {
  console.error('❌ Error removing data:', error);
  process.exit(1);
} finally {
  db.close();
}
