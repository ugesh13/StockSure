import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { INITIAL_PRODUCTS, Product } from '@/data/products';

export interface User {
  id: string;
  name: string;
  email: string;
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
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    notes?: string;
  };
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: 'confirmed' | 'preparing' | 'in_transit' | 'delivered';
  createdAt: string;
}

interface DBStore {
  products: Product[];
  users: User[];
  orders: Order[];
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

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // Fallback if corrupt
    }
  }

  // Initial seed with demo user
  const demoSalt = crypto.randomBytes(16).toString('hex');
  const demoUser: User = {
    id: 'usr_demo_01',
    name: 'Priya Sharma',
    email: 'priya@stocksure.in',
    salt: demoSalt,
    passwordHash: hashPassword('plantlover2026', demoSalt),
    createdAt: new Date().toISOString(),
  };

  const store: DBStore = {
    products: INITIAL_PRODUCTS,
    users: [demoUser],
    orders: [],
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  return store;
}

// In-memory cache synced with disk
const memoryStore: DBStore = initStore();

function persist(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

export const db = {
  // Products
  getProducts(): Product[] {
    return memoryStore.products;
  },

  getProductById(id: string): Product | undefined {
    return memoryStore.products.find((p) => p.id === id);
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
    const user = this.findUserByEmail(email);
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

    // 2. Decrement stock
    for (const item of data.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        product.stock -= item.quantity;
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
};
