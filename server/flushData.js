import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'db', 'crypto.db');

console.log('🗑️  Flushing database data...');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

try {
  // Count records before deletion
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;

  console.log('\n📊 Current data:');
  console.log(`   Transactions: ${txCount}`);
  console.log(`   Orders: ${orderCount}`);
  console.log(`   Products: ${productCount}`);
  console.log(`   Active sessions: ${sessionCount}`);

  // Delete all data
  console.log('\n🧹 Clearing data...');

  db.prepare('DELETE FROM order_items').run();
  console.log('   ✓ Order items cleared');

  db.prepare('DELETE FROM orders').run();
  console.log('   ✓ Orders cleared');

  db.prepare('DELETE FROM products').run();
  console.log('   ✓ Products cleared');

  db.prepare('DELETE FROM transactions').run();
  console.log('   ✓ Transactions cleared');

  db.prepare('DELETE FROM sessions').run();
  console.log('   ✓ Sessions cleared');

  console.log('\n✅ All data flushed successfully!');
  console.log('   Admin accounts preserved.');

} catch (error) {
  console.error('❌ Error flushing data:', error);
  process.exit(1);
} finally {
  db.close();
}
