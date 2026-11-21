/**
 * StockSure Unified Typed Backend Client
 * All requests route through the Next.js rewrite proxy at /backend/:path*
 * strictly targeting the Fastify API (default http://127.0.0.1:3000)
 */

export interface BackendProduct {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  price_paise: number;
  image_url: string | null;
  image_credit: string | null;
  image_status: 'ok' | 'needs_review' | 'missing';
  available_total?: number;
  branches?: Array<{
    branch_id: number;
    branch_name: string;
    city: string;
    available: number;
    status: string;
  }>;
}

export interface Product {
  id: string;
  productId: number;
  name: string;
  scientificName: string;
  category: string;
  categoryLabel: string;
  price: number; // In Rupees
  price_paise: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  stock: number;
  description: string;
  features: string[];
  dimensions: string;
  light: string;
  water: string;
  petFriendly: boolean;
  difficulty: string;
  imageUrl: string;
  secondaryImageUrl?: string;
  bestseller?: boolean;
  newArrival?: boolean;
  branches?: Array<{
    branch_id: number;
    branch_name: string;
    city: string;
    available: number;
    status: string;
  }>;
}

export interface Branch {
  id: number;
  name: string;
  city: string;
  lat: number;
  lng: number;
  last_heartbeat_at?: string;
  stock_confirmed?: boolean;
  address?: string;
  hours?: string;
  phone?: string;
}

export interface AuthResponse {
  customer_id: number;
  token: string;
  name: string;
  email?: string | null;
}

export interface MeResponse {
  customer_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_guest: boolean;
}

export interface CartLine {
  product_id: number;
  branch_id: number;
  qty: number;
  name?: string;
  price_paise?: number;
  image_url?: string | null;
}

export interface BackendCart {
  customer_id: number;
  items: CartLine[];
  total_paise: number;
}

export interface OrderLine {
  product_id: number;
  branch_id: number;
  qty: number;
  unit_price_paise: number;
  name?: string;
  image_url?: string | null;
}

export interface Order {
  id: string;
  status: string;
  fulfilment: string;
  branch_id?: number;
  total_paise: number;
  created_at: string;
  lines: OrderLine[];
  delivery?: any;
}

export interface PaymentAttempt {
  provider: 'mock' | 'razorpay';
  provider_order_id: string;
  amount_paise: number;
  currency: string;
  key_id?: string;
}

export interface DeliveryQuote {
  serviceable: boolean;
  branch_id?: number;
  branch_name?: string;
  distance_km?: number;
  fee_paise?: number;
  eta_minutes?: number;
  reason?: string;
}

export interface DeliveryTracking {
  order_id: string;
  status: string;
  eta_minutes: number;
  branch: { id: number; name: string; city: string };
  destination: {
    name: string;
    phone_masked: string;
    line1: string;
    city: string;
    pincode: string;
  };
  rider?: {
    name: string;
    phone: string;
    lat: number;
    lng: number;
    stale: boolean;
  };
  handover_code?: string;
  history: Array<{ status: string; at: string; note?: string }>;
}

export interface ChatResponse {
  intent: string;
  reply: string;
  action?: {
    type: string;
    payload?: Record<string, any>;
  };
  suggestions?: string[];
}

const TOKEN_KEY = 'stocksure_token';
const CUSTOMER_ID_KEY = 'stocksure_customer_id';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredSession(token: string, customerId: number | string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CUSTOMER_ID_KEY, String(customerId));
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_ID_KEY);
}

export function formatImageUrl(url?: string | null, plantName?: string): string {
  if (url && typeof url === 'string' && url.trim()) {
    const clean = url.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('/static/plants/')) {
      return `/backend${clean}`;
    }
    if (clean.startsWith('static/plants/')) {
      return `/backend/${clean}`;
    }
    if (clean.startsWith('/')) {
      return clean;
    }
    return `/backend/${clean}`;
  }

  if (plantName && typeof plantName === 'string') {
    const slug = plantName
      .split(',')[0]
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (slug) {
      return `/backend/static/plants/${slug}.jpg`;
    }
  }

  return '/products/money-plant.jpg';
}

export function adaptProduct(bp: BackendProduct): Product {
  const priceRupees = Math.round(bp.price_paise / 100);
  const words = bp.name.split(',')[0].trim();
  
  return {
    id: String(bp.id),
    productId: bp.id,
    name: bp.name,
    scientificName: bp.tags && bp.tags.length > 2 ? bp.tags.slice(0, 2).join(' ') : 'Botanical specimen',
    category: bp.category ? bp.category.toLowerCase().replace(/\s+/g, '-') : 'indoor-plants',
    categoryLabel: bp.category || 'Indoor Foliage',
    price: priceRupees,
    price_paise: bp.price_paise,
    originalPrice: Math.round(priceRupees * 1.25),
    rating: 4.8,
    reviewsCount: 36 + (bp.id % 40),
    stock: bp.available_total !== undefined ? bp.available_total : 24,
    description: `${bp.name} from StockSure Nursery. Acclimated and potted with organic, peat-free balanced substrate for optimal indoor and balcony vitality.`,
    features: bp.tags && bp.tags.length > 0
      ? bp.tags.map(t => t.charAt(0).toUpperCase() + t.slice(1))
      : ['Peat-Free Substrate', 'Low Maintenance', 'Air Purifying'],
    dimensions: bp.name.toLowerCase().includes('6-inch')
      ? '6" Biodegradable Pot (14"-18" Height)'
      : '4" Biodegradable Pot (8"-12" Height)',
    light: bp.name.toLowerCase().includes('snake') || bp.name.toLowerCase().includes('money')
      ? 'Low to Bright Indirect'
      : 'Bright Indirect',
    water: bp.name.toLowerCase().includes('snake')
      ? 'Every 2-3 weeks'
      : 'When top 2 inches dry',
    petFriendly: !bp.tags?.includes('toxic'),
    difficulty: 'Easy',
    imageUrl: formatImageUrl(bp.image_url, bp.name),
    bestseller: bp.id % 3 === 0,
    newArrival: bp.id % 2 === 0,
    branches: bp.branches,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  const res = await fetch(`/backend${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

export const backend = {
  // Health
  async health(): Promise<{ status: string; ok: boolean; services: any; time: string }> {
    return request('/health');
  },

  // Catalog
  async getProducts(params: {
    category?: string;
    city?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ page: number; page_size: number; total: number; products: BackendProduct[] }> {
    const sp = new URLSearchParams();
    if (params.category && params.category !== 'all') sp.set('category', params.category);
    if (params.city) sp.set('city', params.city);
    if (params.page) sp.set('page', String(params.page));
    if (params.pageSize) sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },

  async getProduct(id: number | string): Promise<BackendProduct> {
    return request(`/products/${id}`);
  },

  async getCategories(): Promise<{ categories: Array<{ category: string; products: number }> }> {
    return request('/categories');
  },

  async getBranches(): Promise<{ branches: Branch[] }> {
    return request('/branches');
  },

  async searchProducts(params: {
    q: string;
    category?: string;
    city?: string;
    branch_id?: number;
  }): Promise<{ source: string; took_ms: number; total: number; results: any[] }> {
    const sp = new URLSearchParams();
    sp.set('q', params.q);
    if (params.category && params.category !== 'all') sp.set('category', params.category);
    if (params.city) sp.set('city', params.city);
    if (params.branch_id) sp.set('branch_id', String(params.branch_id));
    return request(`/search?${sp.toString()}`);
  },

  // Cart
  async getCart(): Promise<BackendCart> {
    return request('/cart');
  },

  async addToCart(productId: number, branchId: number, qty: number = 1): Promise<BackendCart> {
    return request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, branch_id: branchId, qty }),
    });
  },

  async updateCartItem(productId: number, branchId: number, qty: number): Promise<BackendCart> {
    return request(`/cart/items/${productId}/${branchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty }),
    });
  },

  async removeFromCart(productId: number, branchId: number): Promise<BackendCart> {
    return request(`/cart/items/${productId}/${branchId}`, {
      method: 'DELETE',
    });
  },

  async clearCart(): Promise<BackendCart> {
    return request('/cart', {
      method: 'DELETE',
    });
  },

  // Checkout & Orders
  async checkout(payload: {
    fulfilment: 'PICKUP' | 'DELIVERY' | 'IN_STORE';
    branch_id?: number;
    address?: {
      name: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      pincode: string;
      lat?: number;
      lng?: number;
    };
  }): Promise<{ order: Order; replay?: boolean }> {
    const idempotencyKey = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return request('/checkout', {
      method: 'POST',
      headers: {
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  },

  async payOrder(orderId: string): Promise<{ order: Order; replay?: boolean }> {
    return request(`/orders/${orderId}/pay`, {
      method: 'POST',
    });
  },

  async cancelOrder(orderId: string): Promise<{ order: Order }> {
    return request(`/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },

  async getOrders(limit: number = 20, before?: string): Promise<{ orders: Order[]; next_before?: string | null }> {
    const sp = new URLSearchParams();
    sp.set('limit', String(limit));
    if (before) sp.set('before', before);
    return request(`/orders?${sp.toString()}`);
  },

  async getOrder(orderId: string): Promise<{ order: Order }> {
    return request(`/orders/${orderId}`);
  },

  // Payments
  async createPayment(orderId: string): Promise<PaymentAttempt> {
    return request(`/orders/${orderId}/payment`, {
      method: 'POST',
    });
  },

  async verifyPayment(
    orderId: string,
    payload: {
      provider_order_id: string;
      provider_payment_id: string;
      signature: string;
    }
  ): Promise<{ ok: boolean; status: string; order?: Order }> {
    return request(`/orders/${orderId}/payment/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPaymentStatus(orderId: string): Promise<{ status: string; provider?: string }> {
    return request(`/orders/${orderId}/payment`);
  },

  // Delivery & Maps
  async getDeliveryQuote(lat: number, lng: number, amount_paise: number = 0): Promise<DeliveryQuote> {
    return request(`/delivery/quote?lat=${lat}&lng=${lng}&amount_paise=${amount_paise}`);
  },

  async getOrderTracking(orderId: string): Promise<DeliveryTracking> {
    return request(`/orders/${orderId}/tracking`);
  },

  async getNearestBranches(lat: number, lng: number, limit: number = 5): Promise<{ branches: Branch[] }> {
    return request(`/branches/nearest?lat=${lat}&lng=${lng}&limit=${limit}`);
  },

  async getBranchDirections(
    branchId: number,
    fromLat: number,
    fromLng: number,
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<any> {
    return request(`/branches/${branchId}/directions?from_lat=${fromLat}&from_lng=${fromLng}&mode=${mode}`);
  },

  // Auth & Customers
  async register(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      setStoredSession(res.token, res.customer_id);
    }
    return res;
  },

  async login(payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      setStoredSession(res.token, res.customer_id);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearStoredSession();
    }
  },

  async getMe(): Promise<MeResponse> {
    return request('/me');
  },

  async exchangeGoogleCode(code: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/google/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (res.token) {
      setStoredSession(res.token, res.customer_id);
    }
    return res;
  },

  async createSession(name?: string): Promise<{ customer_id: number; token: string }> {
    const res = await request<{ customer_id: number; token: string }>('/session', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (res.token) {
      setStoredSession(res.token, res.customer_id);
    }
    return res;
  },

  // Chat
  async sendChatMessage(
    message: string,
    context?: { city?: string }
  ): Promise<ChatResponse> {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  },
};
