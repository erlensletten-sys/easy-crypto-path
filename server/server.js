import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';
import * as openpgp from 'openpgp';
import crypto from 'crypto';
import { verifyTransaction, getMinConfirmations, hasEnoughConfirmations } from './blockchainVerification.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'db', 'crypto.db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production-' + Math.random();

// Initialize database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Trust proxy (required for rate limiting behind nginx)
app.set('trust proxy', 1);

// Ensure uploads directory exists
const uploadsDir = join(__dirname, 'uploads', 'products');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `product-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many registration attempts, please try again later'
});

const pgpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 attempts
  message: 'Too many PGP verification attempts, please try again later'
});

// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = db.prepare(`
      SELECT s.*, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;
    req.userRole = session.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User registration
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if username or email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, email, role)
      VALUES (?, ?, ?, ?)
    `).run(username, passwordHash, email, 'user');

    const userId = result.lastInsertRowid;

    // Auto-login: create session
    const token = jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(
      userId,
      token,
      expiresAt
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        email,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User/Admin login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);

    // Case 1: Regular user → immediate token
    if (user.role === 'user') {
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        user.id,
        token,
        expiresAt
      );

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    }

    // Case 2: Admin without PGP → token + setup flag
    if (user.role === 'admin' && !user.pgp_enabled) {
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        user.id,
        token,
        expiresAt
      );

      return res.json({
        token,
        requiresPgpSetup: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    }

    // Case 3: Admin with PGP → challenge
    if (user.role === 'admin' && user.pgp_enabled) {
      const challenge = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Delete old challenges for this user
      db.prepare('DELETE FROM pgp_challenges WHERE user_id = ?').run(user.id);

      // Store new challenge
      db.prepare('INSERT INTO pgp_challenges (user_id, challenge_string, expires_at) VALUES (?, ?, ?)').run(
        user.id,
        challenge,
        expiresAt.toISOString()
      );

      return res.json({
        requiresPgp: true,
        userId: user.id,
        challenge,
        expiresAt: expiresAt.toISOString()
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PGP verification
app.post('/api/auth/verify-pgp', pgpVerifyLimiter, async (req, res) => {
  try {
    const { userId, signature } = req.body;

    if (!userId || !signature) {
      return res.status(400).json({ error: 'User ID and signature required' });
    }

    // Get user and challenge
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || user.role !== 'admin' || !user.pgp_enabled) {
      return res.status(401).json({ error: 'Invalid user or PGP not enabled' });
    }

    const challengeRecord = db.prepare(`
      SELECT * FROM pgp_challenges
      WHERE user_id = ? AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);

    if (!challengeRecord) {
      return res.status(401).json({ error: 'No valid challenge found or challenge expired' });
    }

    // Verify signature
    try {
      const publicKey = await openpgp.readKey({ armoredKey: user.pgp_public_key });
      const cleartextMessage = await openpgp.readCleartextMessage({ cleartextMessage: signature });

      const verificationResult = await openpgp.verify({
        message: cleartextMessage,
        verificationKeys: publicKey
      });

      const { verified } = verificationResult.signatures[0];
      await verified; // Will throw if verification fails

      // Verification successful - delete challenge and create session
      db.prepare('DELETE FROM pgp_challenges WHERE user_id = ?').run(userId);

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        user.id,
        token,
        expiresAt
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (pgpError) {
      console.error('PGP verification failed:', pgpError);
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    console.error('PGP verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PGP setup
app.post('/api/auth/setup-pgp', authenticate, requireAdmin, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public key required' });
    }

    // Validate PGP key format
    try {
      await openpgp.readKey({ armoredKey: publicKey });
    } catch (pgpError) {
      return res.status(400).json({ error: 'Invalid PGP public key format' });
    }

    // Store public key and enable PGP
    db.prepare('UPDATE users SET pgp_public_key = ?, pgp_enabled = 1 WHERE id = ?').run(
      publicKey,
      req.userId
    );

    // Invalidate all sessions for this user (force re-login)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.userId);

    res.json({ message: 'PGP setup completed. Please login again.' });
  } catch (error) {
    console.error('PGP setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get PGP status
app.get('/api/auth/pgp-status', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT pgp_enabled, pgp_public_key FROM users WHERE id = ?').get(req.userId);
    res.json({
      pgpEnabled: Boolean(user.pgp_enabled),
      hasPublicKey: Boolean(user.pgp_public_key)
    });
  } catch (error) {
    console.error('PGP status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  try {
    const token = req.headers.authorization.substring(7);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, req.userId);

    // Invalidate all sessions for this user
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.userId);

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions (admin only)
app.get('/api/transactions', authenticate, requireAdmin, (req, res) => {
  try {
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all();
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { tx_hash, crypto_id, amount, address } = req.body;

    if (!tx_hash || !crypto_id || !amount || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = db.prepare(`
      INSERT INTO transactions (tx_hash, crypto_id, amount, address)
      VALUES (?, ?, ?, ?)
    `).run(tx_hash, crypto_id, amount, address);

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(transaction);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Transaction hash already exists' });
    }
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction status
app.patch('/api/transactions/:txHash', async (req, res) => {
  try {
    const { status, confirmations } = req.body;
    const { txHash } = req.params;

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (confirmations !== undefined) {
      updates.push('confirmations = ?');
      params.push(confirmations);
    }

    updates.push(`updated_at = datetime('now')`);
    params.push(txHash);

    db.prepare(`
      UPDATE transactions
      SET ${updates.join(', ')}
      WHERE tx_hash = ?
    `).run(...params);

    const transaction = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction by hash
app.get('/api/transactions/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const transaction = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PRODUCTS ENDPOINTS ============

// Get all products (admin only)
app.get('/api/products', authenticate, (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public products (no auth required)
app.get('/api/products/public', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC').all();
    res.json(products);
  } catch (error) {
    console.error('Get public products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
app.get('/api/products/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (admin only)
app.post('/api/products', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, description, price, stock, category, image_url } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = db.prepare(`
      INSERT INTO products (name, description, price, stock, category, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description, price, stock || 0, category, image_url);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (admin only)
app.put('/api/products/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, image_url, is_active } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (stock !== undefined) { updates.push('stock = ?'); params.push(stock); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    updates.push(`updated_at = datetime('now')`);
    params.push(id);

    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (admin only)
app.delete('/api/products/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload product photo (admin only)
app.post('/api/products/upload-photo', authenticate, requireAdmin, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL path to the uploaded file
    const imageUrl = `/uploads/products/${req.file.filename}`;
    res.json({
      message: 'Photo uploaded successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ORDERS ENDPOINTS ============

// Get all orders (filtered by role)
app.get('/api/orders', authenticate, (req, res) => {
  try {
    let query = `
      SELECT o.*,
             GROUP_CONCAT(oi.product_name || ' x' || oi.quantity) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    const params = [];

    // Non-admins see only their own orders
    if (req.userRole !== 'admin') {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
      query += ` WHERE o.customer_email = ?`;
      params.push(user.email);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single order with items
app.get('/api/orders/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
app.post('/api/orders', authenticate, (req, res) => {
  try {
    const { customer_email, customer_name, items, shipping_address, notes, payment_method } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.price * item.quantity;
    }

    // Generate order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Insert order
    const result = db.prepare(`
      INSERT INTO orders (order_number, customer_email, customer_name, total_amount, shipping_address, notes, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orderNumber, customer_email, customer_name, total, shipping_address, notes, payment_method || 'crypto');

    const orderId = result.lastInsertRowid;

    // Insert order items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(orderId, item.product_id, item.product_name, item.quantity, item.price);
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    order.items = orderItems;

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
app.patch('/api/orders/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_tx_hash, notes } = req.body;

    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (payment_tx_hash) { updates.push('payment_tx_hash = ?'); params.push(payment_tx_hash); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    updates.push(`updated_at = datetime('now')`);
    params.push(id);

    db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete order (admin only)
app.delete('/api/orders/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ WALLET MANAGEMENT ENDPOINTS ============

// Get all wallets (admin only)
app.get('/api/wallets', authenticate, requireAdmin, (req, res) => {
  try {
    const wallets = db.prepare('SELECT * FROM wallets ORDER BY created_at DESC').all();
    res.json(wallets);
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active wallets by crypto (admin only)
app.get('/api/wallets/:cryptoId', authenticate, requireAdmin, (req, res) => {
  try {
    const { cryptoId } = req.params;
    const wallets = db.prepare('SELECT * FROM wallets WHERE crypto_id = ? AND is_active = 1').all(cryptoId);
    res.json(wallets);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create wallet (admin only)
app.post('/api/wallets', authenticate, requireAdmin, (req, res) => {
  try {
    const { crypto_id, type, value, label } = req.body;

    if (!crypto_id || !type || !value) {
      return res.status(400).json({ error: 'Crypto ID, type, and value are required' });
    }

    if (!['address', 'xpub'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "address" or "xpub"' });
    }

    const result = db.prepare(`
      INSERT INTO wallets (crypto_id, type, value, label)
      VALUES (?, ?, ?, ?)
    `).run(crypto_id, type, value, label || null);

    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(wallet);
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update wallet (admin only)
app.put('/api/wallets/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { crypto_id, type, value, label, is_active } = req.body;

    const updates = [];
    const params = [];

    if (crypto_id !== undefined) { updates.push('crypto_id = ?'); params.push(crypto_id); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (value !== undefined) { updates.push('value = ?'); params.push(value); }
    if (label !== undefined) { updates.push('label = ?'); params.push(label); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    updates.push(`updated_at = datetime('now')`);
    params.push(id);

    db.prepare(`UPDATE wallets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(wallet);
  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete wallet (admin only)
app.delete('/api/wallets/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    db.prepare('DELETE FROM wallets WHERE id = ?').run(id);
    res.json({ message: 'Wallet deleted successfully' });
  } catch (error) {
    console.error('Delete wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PAYMENT VERIFICATION ============

// Verify payment for an order
app.post('/api/orders/:id/verify-payment', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { txHash, cryptoId } = req.body;

    if (!txHash || !cryptoId) {
      return res.status(400).json({ error: 'Transaction hash and crypto ID required' });
    }

    // Get the order
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // For non-admins, verify they own this order
    if (req.userRole !== 'admin') {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
      if (order.customer_email !== user.email) {
        return res.status(403).json({ error: 'Not authorized to verify this order' });
      }
    }

    // Verify transaction on blockchain
    console.log(`🔍 Verifying payment for order ${order.order_number}`);
    const verification = await verifyTransaction(txHash, cryptoId);

    if (!verification.found) {
      return res.status(400).json({
        error: 'Transaction verification failed',
        details: verification.error || 'Transaction not found on blockchain'
      });
    }

    // Check if transaction already exists in our database
    let transaction = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);

    if (!transaction) {
      // Create new transaction record with blockchain data
      const result = db.prepare(`
        INSERT INTO transactions (tx_hash, crypto_id, amount, address, status, confirmations)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        txHash,
        cryptoId.toLowerCase(),
        verification.amount || 0,
        verification.to || verification.from || 'verified',
        verification.status,
        verification.confirmations || 0
      );

      transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    } else {
      // Update existing transaction with latest blockchain data
      db.prepare(`
        UPDATE transactions
        SET confirmations = ?, status = ?, updated_at = datetime('now')
        WHERE tx_hash = ?
      `).run(verification.confirmations || 0, verification.status, txHash);

      transaction = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);
    }

    // Update order with payment transaction hash and status
    const newOrderStatus = verification.status === 'verified' ? 'processing' : 'pending';
    db.prepare(`
      UPDATE orders
      SET payment_tx_hash = ?, payment_method = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(txHash, cryptoId.toLowerCase(), newOrderStatus, id);

    // Return updated order and transaction status
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    updatedOrder.items = items;
    updatedOrder.transaction = transaction;

    const minConfirmations = getMinConfirmations(cryptoId);

    res.json({
      message: verification.status === 'verified'
        ? 'Payment verified successfully'
        : `Payment found but waiting for confirmations (${verification.confirmations}/${minConfirmations})`,
      order: updatedOrder,
      transaction,
      verification: {
        found: true,
        confirmations: verification.confirmations,
        minConfirmations,
        status: verification.status,
        blockHeight: verification.blockHeight || verification.blockNumber
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check payment status
app.get('/api/orders/:id/payment-status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // For non-admins, verify they own this order
    if (req.userRole !== 'admin') {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
      if (order.customer_email !== user.email) {
        return res.status(403).json({ error: 'Not authorized to view this order' });
      }
    }

    // Get transaction if exists
    let transaction = null;
    if (order.payment_tx_hash) {
      transaction = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(order.payment_tx_hash);
    }

    const minConfirmations = transaction ? getMinConfirmations(transaction.crypto_id) : 0;

    res.json({
      orderId: order.id,
      orderNumber: order.order_number,
      paymentTxHash: order.payment_tx_hash,
      paymentMethod: order.payment_method,
      orderStatus: order.status,
      transaction: transaction || null,
      minConfirmations
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh payment status (check blockchain for updates)
app.post('/api/orders/:id/refresh-payment', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment_tx_hash || !order.payment_method) {
      return res.status(400).json({ error: 'No payment transaction to refresh' });
    }

    // For non-admins, verify they own this order
    if (req.userRole !== 'admin') {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
      if (order.customer_email !== user.email) {
        return res.status(403).json({ error: 'Not authorized to refresh this order' });
      }
    }

    // Re-verify transaction on blockchain
    console.log(`🔄 Refreshing payment status for order ${order.order_number}`);
    const verification = await verifyTransaction(order.payment_tx_hash, order.payment_method);

    if (!verification.found) {
      return res.status(400).json({
        error: 'Transaction verification failed',
        details: verification.error
      });
    }

    // Update transaction in database
    db.prepare(`
      UPDATE transactions
      SET confirmations = ?, status = ?, updated_at = datetime('now')
      WHERE tx_hash = ?
    `).run(verification.confirmations || 0, verification.status, order.payment_tx_hash);

    // Update order status if payment is now verified
    if (verification.status === 'verified' && order.status === 'pending') {
      db.prepare(`
        UPDATE orders
        SET status = 'processing', updated_at = datetime('now')
        WHERE id = ?
      `).run(id);
    }

    // Get updated data
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const transaction = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(order.payment_tx_hash);
    const minConfirmations = getMinConfirmations(order.payment_method);

    res.json({
      message: verification.status === 'verified'
        ? 'Payment verified successfully'
        : `Payment status updated (${verification.confirmations}/${minConfirmations} confirmations)`,
      order: updatedOrder,
      transaction,
      verification: {
        found: true,
        confirmations: verification.confirmations,
        minConfirmations,
        status: verification.status
      }
    });
  } catch (error) {
    console.error('Refresh payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CRYPTO PRICE API (PROXIED) ============

// Get cryptocurrency prices (public endpoint, proxied through our server)
app.get('/api/crypto/prices', async (req, res) => {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter required (e.g., ?symbols=btc,eth)' });
    }

    // Convert symbols to CoinGecko IDs
    const symbolMap = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'usdt': 'tether',
      'usdc': 'usd-coin',
      'bnb': 'binancecoin',
      'xrp': 'ripple',
      'ada': 'cardano',
      'doge': 'dogecoin',
      'sol': 'solana',
      'ltc': 'litecoin',
      'trx': 'tron',
      'matic': 'matic-network',
    };

    const requestedSymbols = symbols.toLowerCase().split(',').map(s => s.trim());
    const coinIds = requestedSymbols
      .map(symbol => symbolMap[symbol])
      .filter(Boolean)
      .join(',');

    if (!coinIds) {
      return res.status(400).json({ error: 'Invalid symbols provided' });
    }

    // Fetch from CoinGecko API (proxied through our server)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=nok&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prices from CoinGecko');
    }

    const data = await response.json();

    // Transform to our format
    const prices = {};
    requestedSymbols.forEach(symbol => {
      const coinId = symbolMap[symbol];
      if (coinId && data[coinId]) {
        prices[symbol.toUpperCase()] = {
          nok: data[coinId].nok,
          nok_24h_change: data[coinId].nok_24h_change,
          nok_24h_vol: data[coinId].nok_24h_vol,
          last_updated_at: data[coinId].last_updated_at,
        };
      }
    });

    res.json(prices);
  } catch (error) {
    console.error('Crypto prices error:', error);
    res.status(500).json({ error: 'Failed to fetch cryptocurrency prices' });
  }
});

// Get list of supported cryptocurrencies
app.get('/api/crypto/supported', (req, res) => {
  try {
    const supported = [
      { symbol: 'BTC', name: 'Bitcoin', coinGeckoId: 'bitcoin' },
      { symbol: 'ETH', name: 'Ethereum', coinGeckoId: 'ethereum' },
      { symbol: 'USDT', name: 'Tether', coinGeckoId: 'tether' },
      { symbol: 'USDC', name: 'USD Coin', coinGeckoId: 'usd-coin' },
      { symbol: 'BNB', name: 'Binance Coin', coinGeckoId: 'binancecoin' },
      { symbol: 'XRP', name: 'Ripple', coinGeckoId: 'ripple' },
      { symbol: 'ADA', name: 'Cardano', coinGeckoId: 'cardano' },
      { symbol: 'DOGE', name: 'Dogecoin', coinGeckoId: 'dogecoin' },
      { symbol: 'SOL', name: 'Solana', coinGeckoId: 'solana' },
      { symbol: 'LTC', name: 'Litecoin', coinGeckoId: 'litecoin' },
      { symbol: 'TRX', name: 'Tron', coinGeckoId: 'tron' },
      { symbol: 'MATIC', name: 'Polygon', coinGeckoId: 'matic-network' },
    ];
    res.json(supported);
  } catch (error) {
    console.error('Supported cryptos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup expired challenges (run on start and every hour)
const cleanupExpiredChallenges = () => {
  try {
    const result = db.prepare("DELETE FROM pgp_challenges WHERE expires_at < datetime('now')").run();
    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} expired PGP challenge(s)`);
    }
  } catch (error) {
    console.error('Challenge cleanup error:', error);
  }
};

// Initial cleanup
cleanupExpiredChallenges();

// Schedule cleanup every hour
setInterval(cleanupExpiredChallenges, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close();
  process.exit(0);
});
