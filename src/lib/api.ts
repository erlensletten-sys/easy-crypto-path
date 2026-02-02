const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(username: string, password: string, email: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_role', data.user.role);
    return data;
  }

  async login(username: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // Direct login (user or admin without PGP)
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('requires_pgp_setup', data.requiresPgpSetup || 'false');
      return data;
    }

    // Admin with PGP - return challenge
    if (data.requiresPgp) {
      return data; // { requiresPgp: true, userId, challenge, expiresAt }
    }

    return data;
  }

  async verifyPgp(userId: number, signature: string) {
    const data = await this.request('/auth/verify-pgp', {
      method: 'POST',
      body: JSON.stringify({ userId, signature }),
    });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_role', data.user.role);
    localStorage.removeItem('requires_pgp_setup');
    return data;
  }

  async setupPgp(publicKey: string) {
    return this.request('/auth/setup-pgp', {
      method: 'POST',
      body: JSON.stringify({ publicKey }),
    });
  }

  async getPgpStatus() {
    return this.request('/auth/pgp-status');
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('requires_pgp_setup');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const data = await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    this.token = null;
    localStorage.removeItem('auth_token');
    return data;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  requiresPgpSetup(): boolean {
    return localStorage.getItem('requires_pgp_setup') === 'true';
  }

  // Transactions
  async getTransactions() {
    return this.request('/transactions');
  }

  async createTransaction(tx_hash: string, crypto_id: string, amount: number, address: string) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({ tx_hash, crypto_id, amount, address }),
    });
  }

  async updateTransaction(txHash: string, status?: string, confirmations?: number) {
    return this.request(`/transactions/${txHash}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, confirmations }),
    });
  }

  async getTransaction(txHash: string) {
    return this.request(`/transactions/${txHash}`);
  }

  // Products
  async getProducts() {
    return this.request('/products');
  }

  async getPublicProducts() {
    return this.request('/products/public');
  }

  async getProduct(id: number) {
    return this.request(`/products/${id}`);
  }

  async uploadProductPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/products/upload-photo`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: number, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: number) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id: number) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(data: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrder(id: number, data: any) {
    return this.request(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOrder(id: number) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Wallets
  async getWallets() {
    return this.request('/wallets');
  }

  async getWallet(cryptoId: string) {
    return this.request(`/wallets/${cryptoId}`);
  }

  async createWallet(data: any) {
    return this.request('/wallets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWallet(id: number, data: any) {
    return this.request(`/wallets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWallet(id: number) {
    return this.request(`/wallets/${id}`, {
      method: 'DELETE',
    });
  }

  // Crypto Prices (proxied)
  async getCryptoPrices(symbols: string[]) {
    return this.request(`/crypto/prices?symbols=${symbols.join(',')}`);
  }

  async getSupportedCryptos() {
    return this.request('/crypto/supported');
  }

  // Payment verification
  async verifyPayment(orderId: number, txHash: string, cryptoId: string) {
    return this.request(`/orders/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ txHash, cryptoId }),
    });
  }

  async getPaymentStatus(orderId: number) {
    return this.request(`/orders/${orderId}/payment-status`);
  }

  async refreshPayment(orderId: number) {
    return this.request(`/orders/${orderId}/refresh-payment`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
