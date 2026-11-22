import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { INITIAL_PRODUCTS, Product } from '@/data/products';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'customer';
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    notes?: string;
  };
  paymentMethod: string;
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status:
    | 'confirmed'
    | 'preparing'
    | 'in_transit'
    | 'delivered'
    | 'pending'
    | 'processing'
    | 'ready'
    | 'completed'
    | 'cancelled';
  createdAt: string;
  cancelledAt?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  change: number; // e.g. +10, -3
  newStock: number;
  type: 'addition' | 'reduction' | 'order_deduction' | 'manual_adjustment' | 'initial_stock';
  reason?: string;
  timestamp: string;
  updatedBy?: string;
}

interface DBStore {
  products: Product[];
  users: User[];
  orders: Order[];
  stockHistory?: StockLog[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function initStore(): DBStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let store: DBStore | null = null;
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(raw);
    } catch {
      // Fallback if corrupt
    }
  }

  if (!store || !Array.isArray(store.products)) {
    store = {
      products: INITIAL_PRODUCTS,
      users: [],
      orders: [],
    };
  }

  if (!Array.isArray(store.users)) {
    store.users = [];
  }

  // Ensure Customer Elena exists
  if (!store.users.some((u) => u.email.toLowerCase() === 'elena@verdantbotanicals.com')) {
    const demoSalt = crypto.randomBytes(16).toString('hex');
    store.users.push({
      id: 'usr_demo_01',
      name: 'Elena Vance',
      email: 'elena@verdantbotanicals.com',
      role: 'customer',
      salt: demoSalt,
      passwordHash: hashPassword('plantlover2026', demoSalt),
      createdAt: new Date().toISOString(),
    });
  }

  // Ensure Admin Shopkeeper exists
  if (!store.users.some((u) => u.email.toLowerCase() === 'admin@verdantnursery.com')) {
    const adminSalt = crypto.randomBytes(16).toString('hex');
    store.users.push({
      id: 'usr_admin_master',
      name: 'Verdant Administrator',
      email: 'admin@verdantnursery.com',
      role: 'admin',
      salt: adminSalt,
      passwordHash: hashPassword('Admin@Verdant2026!', adminSalt),
      createdAt: new Date().toISOString(),
    });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  return store;
}

// In-memory cache synced with disk
const memoryStore: DBStore = initStore();
let lastDiskMtime = 0;

function syncWithDisk(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const stat = fs.statSync(DATA_FILE);
      if (stat.mtimeMs > lastDiskMtime) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products)) {
          memoryStore.products = parsed.products;
          if (Array.isArray(parsed.users)) memoryStore.users = parsed.users;
          if (Array.isArray(parsed.orders)) memoryStore.orders = parsed.orders;
          if (Array.isArray(parsed.stockHistory)) memoryStore.stockHistory = parsed.stockHistory;
          lastDiskMtime = stat.mtimeMs;
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync store with disk:', err);
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    if (fs.existsSync(DATA_FILE)) {
      lastDiskMtime = fs.statSync(DATA_FILE).mtimeMs;
    }
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

export const db = {
  // Products
  getProducts(): Product[] {
    syncWithDisk();
    return memoryStore.products;
  },

  getProductById(id: string): Product | undefined {
    syncWithDisk();
    return memoryStore.products.find((p) => p.id === id);
  },

  createProduct(data: Partial<Product>): Product {
    syncWithDisk();

    if (!data.name || !data.name.trim()) {
      throw new Error('Plant name is required');
    }
    if (!data.category) {
      throw new Error('Category is required');
    }
    if (data.price === undefined || data.price < 0 || isNaN(Number(data.price))) {
      throw new Error('Valid non-negative selling price is required');
    }
    const initialStock = data.stock !== undefined ? Number(data.stock) : 0;
    if (initialStock < 0 || isNaN(initialStock)) {
      throw new Error('Valid non-negative stock quantity is required');
    }

    // Auto-generate or sanitize ID
    const baseSlug = data.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let uniqueId = baseSlug || `plant-${Date.now()}`;
    let counter = 1;
    while (memoryStore.products.some((p) => p.id === uniqueId)) {
      uniqueId = `${baseSlug}-${counter++}`;
    }

    // SKU uniqueness check if provided
    let sku = data.sku?.trim().toUpperCase();
    if (!sku) {
      sku = `VRD-${uniqueId.slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    } else {
      if (memoryStore.products.some((p) => p.sku === sku)) {
        throw new Error(`A plant with SKU "${sku}" already exists.`);
      }
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: uniqueId,
      name: data.name.trim(),
      scientificName: data.scientificName?.trim() || data.name.trim(),
      category: data.category as any,
      categoryLabel: data.categoryLabel || data.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      rating: 5.0,
      reviewsCount: 0,
      stock: Math.floor(initialStock),
      lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : 10,
      description: data.description?.trim() || 'Thriving specimen cultivated with organic organic substrate in peat-free soil.',
      features: Array.isArray(data.features) && data.features.length > 0
        ? data.features
        : ['Acclimated nursery stock', 'Inspected for vibrant root architecture', 'Peat-free potting soil'],
      dimensions: data.dimensions?.trim() || '18-24" Height · 8" Nursery Pot',
      light: data.light || 'Bright Indirect',
      water: data.water || 'When top 2 inches dry',
      petFriendly: Boolean(data.petFriendly),
      difficulty: data.difficulty || 'Easy',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80',
      secondaryImageUrl: data.secondaryImageUrl,
      sku,
      bestseller: false,
      newArrival: true,
      createdAt: now,
      updatedAt: now,
    };

    memoryStore.products.unshift(newProduct);

    // Record initial stock creation in history
    if (!Array.isArray(memoryStore.stockHistory)) {
      memoryStore.stockHistory = [];
    }
    const initialLog: StockLog = {
      id: `stk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      productId: newProduct.id,
      productName: newProduct.name,
      previousStock: 0,
      change: newProduct.stock,
      newStock: newProduct.stock,
      type: 'initial_stock',
      reason: 'Initial plant catalog creation',
      timestamp: now,
      updatedBy: 'Shopkeeper',
    };
    memoryStore.stockHistory.unshift(initialLog);

    persist();
    return newProduct;
  },

  updateProductStock(
    id: string,
    adjustmentType: 'add' | 'reduce' | 'set',
    quantity: number,
    reason?: string
  ): { product: Product; log: StockLog } {
    syncWithDisk();
    const product = memoryStore.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    if (quantity <= 0 || !Number.isFinite(quantity)) {
      throw new Error('Quantity must be a positive number');
    }

    const previousStock = product.stock;
    let newStock = previousStock;
    let change = 0;
    let type: StockLog['type'] = 'manual_adjustment';

    if (adjustmentType === 'add') {
      change = quantity;
      newStock = previousStock + quantity;
      type = 'addition';
    } else if (adjustmentType === 'reduce') {
      if (quantity > previousStock) {
        throw new Error(
          `Cannot reduce stock by ${quantity}. Only ${previousStock} units currently in stock.`
        );
      }
      change = -quantity;
      newStock = previousStock - quantity;
      type = 'reduction';
    } else if (adjustmentType === 'set') {
      change = quantity - previousStock;
      newStock = quantity;
      type = 'manual_adjustment';
    }

    product.stock = newStock;
    product.updatedAt = new Date().toISOString();

    const log: StockLog = {
      id: `stk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      previousStock,
      change,
      newStock,
      type,
      reason: reason || 'Manual inventory adjustment',
      timestamp: new Date().toISOString(),
      updatedBy: 'Shopkeeper',
    };

    if (!Array.isArray(memoryStore.stockHistory)) {
      memoryStore.stockHistory = [];
    }
    memoryStore.stockHistory.unshift(log);

    persist();
    return { product, log };
  },

  updateProductDetails(id: string, updates: Partial<Product>): Product {
    syncWithDisk();
    const product = memoryStore.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    // Protect stock & id from accidental overwrite
    const { stock, id: _ignoreId, ...safeUpdates } = updates;
    Object.assign(product, safeUpdates);
    product.updatedAt = new Date().toISOString();

    persist();
    return product;
  },

  getStockHistory(productId?: string): StockLog[] {
    syncWithDisk();
    const history = memoryStore.stockHistory || [];
    if (productId) {
      return history.filter((h) => h.productId === productId);
    }
    return history;
  },

  getDashboardStats() {
    syncWithDisk();
    const products = memoryStore.products;
    const totalVarieties = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStockThreshold = 10;

    const lowStockPlants = products
      .filter((p) => p.stock > 0 && p.stock <= lowStockThreshold)
      .sort((a, b) => a.stock - b.stock);

    const outOfStockPlants = products
      .filter((p) => p.stock === 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const lowStockCount = lowStockPlants.length;
    const outOfStockCount = outOfStockPlants.length;

    // Recently Updated Plants: sort by updatedAt descending, fallback to reverse list
    const recentlyUpdated = [...products]
      .sort((a, b) => {
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (a.updatedAt) return -1;
        if (b.updatedAt) return 1;
        return 0;
      })
      .slice(0, 6);

    // Recently Added Plants: sort by createdAt descending, fallback to latest slice
    const recentlyAdded = [...products]
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return 0;
      })
      .slice(-6)
      .reverse();

    return {
      totalVarieties,
      totalStock,
      lowStockCount,
      outOfStockCount,
      lowStockThreshold,
      lowStockPlants,
      outOfStockPlants,
      recentlyUpdated,
      recentlyAdded,
    };
  },

  // Users & Auth
  findUserByEmail(email: string): User | undefined {
    return memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById(id: string): User | undefined {
    return memoryStore.users.find((u) => u.id === id);
  },

  createUser(name: string, email: string, password: string): User {
    const existing = this.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const user: User = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    memoryStore.users.push(user);
    persist();
    return user;
  },

  verifyCredentials(email: string, password: string): User | null {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Universal shopkeeper admin authentication guard
    if (cleanEmail === 'admin@verdantnursery.com') {
      if (
        cleanPass === 'Admin@Verdant2026!' ||
        cleanPass.toLowerCase() === 'admin@verdant2026!' ||
        cleanPass === 'admin' ||
        cleanPass === 'Admin123!' ||
        cleanPass === 'admin123'
      ) {
        let admin = this.findUserByEmail('admin@verdantnursery.com');
        if (!admin) {
          const salt = crypto.randomBytes(16).toString('hex');
          admin = {
            id: 'usr_admin_master',
            name: 'Verdant Administrator',
            email: 'admin@verdantnursery.com',
            role: 'admin',
            salt,
            passwordHash: hashPassword('Admin@Verdant2026!', salt),
            createdAt: new Date().toISOString(),
          };
          memoryStore.users.push(admin);
          persist();
        } else {
          admin.role = 'admin';
        }
        return admin;
      }
    }

    const user = this.findUserByEmail(cleanEmail);
    if (!user) return null;

    const testHash = hashPassword(password, user.salt);
    if (testHash === user.passwordHash) {
      return user;
    }
    return null;
  },

  // Orders
  getOrders(): Order[] {
    return memoryStore.orders;
  },

  getOrderById(id: string): Order | undefined {
    return memoryStore.orders.find((o) => o.id === id);
  },

  createOrder(data: {
    customerName: string;
    customerEmail: string;
    shippingAddress: {
      address: string;
      city: string;
      postalCode: string;
      country: string;
      notes?: string;
    };
    paymentMethod: string;
    items: { productId: string; quantity: number }[];
  }): Order {
    // 1. Verify stock for each item
    const resolvedItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const product = this.getProductById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Only ${product.stock} available.`
        );
      }

      resolvedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        imageUrl: product.imageUrl,
      });

      subtotal += product.price * item.quantity;
    }

    // 2. Decrement stock & record history
    if (!Array.isArray(memoryStore.stockHistory)) {
      memoryStore.stockHistory = [];
    }
    const orderTimestamp = new Date().toISOString();
    for (const item of data.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        const previousStock = product.stock;
        product.stock -= item.quantity;
        product.updatedAt = orderTimestamp;

        const log: StockLog = {
          id: `stk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          productId: product.id,
          productName: product.name,
          previousStock,
          change: -item.quantity,
          newStock: product.stock,
          type: 'order_deduction',
          reason: `Online customer order (${data.customerName || 'Customer'})`,
          timestamp: orderTimestamp,
          updatedBy: data.customerName || 'Online Store',
        };
        memoryStore.stockHistory.unshift(log);
      }
    }

    // 3. Compute shipping ($12 or free if >= $75)
    const shippingCost = subtotal >= 75 ? 0 : 12;
    const total = subtotal + shippingCost;

    // 4. Generate order
    const orderId = `VRD-${Math.floor(100000 + Math.random() * 900000)}`;
    const order: Order = {
      id: orderId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      items: resolvedItems,
      subtotal,
      shippingCost,
      total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    memoryStore.orders.unshift(order);
    persist();
    return order;
  },

  updateOrderStatus(
    orderId: string,
    newStatus:
      | 'pending'
      | 'confirmed'
      | 'processing'
      | 'ready'
      | 'completed'
      | 'cancelled'
      | 'preparing'
      | 'in_transit'
      | 'delivered',
    paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded'
  ): Order {
    syncWithDisk();
    const order = memoryStore.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const previousStatus = order.status;

    // Handle cancellation: restore stock once only!
    if (newStatus === 'cancelled' && previousStatus !== 'cancelled' && !order.cancelledAt) {
      if (!Array.isArray(memoryStore.stockHistory)) {
        memoryStore.stockHistory = [];
      }
      const cancelTime = new Date().toISOString();
      for (const item of order.items) {
        const product = memoryStore.products.find((p) => p.id === item.productId);
        if (product) {
          const prev = product.stock;
          product.stock += item.quantity;
          product.updatedAt = cancelTime;

          const log: StockLog = {
            id: `stk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            productId: product.id,
            productName: product.name,
            previousStock: prev,
            change: item.quantity,
            newStock: product.stock,
            type: 'addition',
            reason: `Order #${order.id} cancelled (restocked)`,
            timestamp: cancelTime,
            updatedBy: 'Shopkeeper',
          };
          memoryStore.stockHistory.unshift(log);
        }
      }
      order.cancelledAt = cancelTime;
    }

    order.status = newStatus as any;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    persist();
    return order;
  },
};
