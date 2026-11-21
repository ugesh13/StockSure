/**
 * StockSure Retail API Service
 * Integrates directly with the Fastify + Aiven PostgreSQL + OpenSearch backend
 */

const API_BASE = '/api';

/**
 * Get cached authenticated user if present
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('stocksure_auth_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user && user.token ? user : null;
  } catch {
    return null;
  }
}

/**
 * Get or initialize persistent shopper session
 */
export async function getSession() {
  // 1. Check if authenticated user session exists first
  const authUser = getCurrentUser();
  if (authUser?.token) {
    return authUser;
  }

  // 2. Check cached guest session
  const cached = localStorage.getItem('stocksure_session');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.token) return parsed;
    } catch {
      localStorage.removeItem('stocksure_session');
    }
  }

  // 3. Request fresh guest session from backend
  try {
    const res = await fetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'StockSure Shopper' }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('stocksure_session', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('Could not create backend session, using demo customer fallback', e);
  }

  const demoFallback = {
    customer_id: 1,
    token: 'demo-token-fallback',
    name: 'StockSure Shopper',
  };
  localStorage.setItem('stocksure_session', JSON.stringify(demoFallback));
  return demoFallback;
}

function getAuthHeaders(session, extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (session?.token) {
    headers['x-session-token'] = session.token;
  }
  if (session?.customer_id) {
    headers['x-customer-id'] = String(session.customer_id);
  }
  return headers;
}

/**
 * Customer Authentication: Login
 */
export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Invalid email or password.');
  }

  // Store active authenticated user and session
  localStorage.setItem('stocksure_auth_user', JSON.stringify(data));
  localStorage.setItem('stocksure_session', JSON.stringify(data));
  return data;
}

/**
 * Customer Authentication: Register
 */
export async function register({ name, email, password, phone }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone?.trim() || undefined,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Registration failed. Please try again.');
  }

  localStorage.setItem('stocksure_auth_user', JSON.stringify(data));
  localStorage.setItem('stocksure_session', JSON.stringify(data));
  return data;
}

/**
 * Customer Authentication: Get Profile
 */
export async function getProfile() {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(session),
  });
  if (!res.ok) {
    throw new Error('Failed to load user profile');
  }
  return res.json();
}

/**
 * Customer Authentication: Logout
 */
export async function logout() {
  const session = getCurrentUser() || (await getSession());
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(session),
    });
  } catch (e) {
    console.warn('Backend logout warning:', e);
  } finally {
    localStorage.removeItem('stocksure_auth_user');
    localStorage.removeItem('stocksure_session');
  }
  return { ok: true };
}

/**
 * Fetch product categories with live item counts
 */
export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  const data = await res.json();
  return data.categories || [];
}

/**
 * Fetch products with pagination and category filtering
 */
export async function getProducts({ category, city, page = 1, pageSize = 24 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (city) params.set('city', city);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const res = await fetch(`${API_BASE}/products?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

/**
 * Typo-tolerant product search backed by OpenSearch
 */
export async function searchProducts({ q, category, minPrice, maxPrice, city, size = 40 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category && category !== 'all') params.set('category', category);
  if (minPrice !== undefined) params.set('minPrice', String(minPrice));
  if (maxPrice !== undefined) params.set('maxPrice', String(maxPrice));
  if (city) params.set('city', city);
  params.set('size', String(size));

  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

/**
 * Get product details with branch-level inventory status
 */
export async function getProductDetails(id) {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

/**
 * Fetch customer cart
 */
export async function getCart() {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/cart`, {
    headers: getAuthHeaders(session),
  });
  if (!res.ok) throw new Error('Failed to load cart');
  return res.json();
}

/**
 * Add item to cart
 */
export async function addToCart({ productId, branchId = 1, qty = 1 }) {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify({
      product_id: Number(productId),
      branch_id: Number(branchId),
      qty: Number(qty),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Could not add product to cart');
  }
  return res.json();
}

/**
 * Update cart item quantity
 */
export async function updateCartQty({ productId, branchId = 1, qty }) {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/cart/items/${productId}/${branchId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(session),
    body: JSON.stringify({ qty: Number(qty) }),
  });
  if (!res.ok) throw new Error('Could not update quantity');
  return res.json();
}

/**
 * Remove item from cart
 */
export async function removeCartItem({ productId, branchId = 1 }) {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/cart/items/${productId}/${branchId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(session),
  });
  if (!res.ok) throw new Error('Could not remove item');
  return res.json();
}

/**
 * Clear full cart
 */
export async function clearCart() {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/cart`, {
    method: 'DELETE',
    headers: getAuthHeaders(session),
  });
  if (!res.ok) throw new Error('Could not clear cart');
  return res.json();
}

/**
 * Checkout and reserve stock in backend
 */
export async function checkoutCart({
  fulfilment = 'DELIVERY',
  branchId = 1,
  city = 'Bengaluru',
  idempotencyKey,
} = {}) {
  const session = await getSession();
  const key = idempotencyKey || `chk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(session, {
      'Idempotency-Key': key,
      'x-shopper-city': city,
    }),
    body: JSON.stringify({
      fulfilment,
      branch_id: Number(branchId),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Checkout could not be processed');
  }
  return data;
}

/**
 * Complete order payment
 */
export async function payOrder(orderId) {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
    method: 'POST',
    headers: getAuthHeaders(session),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Payment failed');
  }
  return res.json();
}

/**
 * Fetch order confirmation details
 */
export async function getOrder(orderId) {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: getAuthHeaders(session),
  });
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

/**
 * Fetch caller orders history
 */
export async function getMyOrders() {
  const session = await getSession();
  const res = await fetch(`${API_BASE}/orders`, {
    headers: getAuthHeaders(session),
  });
  if (!res.ok) throw new Error('Could not fetch orders history');
  return res.json();
}
