/**
 * StockSure Frontend API TypeScript Definitions
 * Generated to match backend contract and openapi.json
 * Money amounts are always integer paise (1 Rupee = 100 paise).
 */

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// 1. Auth Types
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterResponse {
  customer_id: number;
  token: string;
  name: string;
  email: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  customer_id: number;
  token: string;
  name: string;
  email: string;
  phone?: string;
}

export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface PasswordForgotRequest {
  email: string;
}

export interface PasswordResetRequest {
  token: string;
  password: string;
}

// 2. Payments Types
export interface CreatePaymentResponse {
  provider: 'mock' | 'razorpay';
  key_id?: string;
  payment_id: number;
  razorpay_order_id?: string;
  amount_paise: number;
  currency: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  order: {
    id: string;
    status: string;
    payment_status: string;
    total_paise: number;
  };
  replay: boolean;
}

export interface PaymentStatusResponse {
  order_id: string;
  status: string;
  amount_paise: number;
  provider: string;
  transaction_id?: string;
  updated_at: string;
}

// 3. Maps & Branch Types
export interface BranchSummary {
  id: number;
  name: string;
  city: string;
  address?: string;
  lat: number;
  lng: number;
  distance_km: number;
  directions_url: string;
  active: boolean;
}

export interface BranchDirections {
  branch_id: number;
  branch_name: string;
  distance_km: number;
  duration_minutes: number;
  directions_url: string;
}

export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
  formatted_address: string;
}

// 4. Delivery & Tracking Types
export interface DeliveryQuoteRequest {
  lat: number;
  lng: number;
  amount_paise?: number;
}

export interface DeliveryQuoteResponse {
  serviceable: boolean;
  branch_id?: number;
  branch_name?: string;
  distance_km?: number;
  fee_paise?: number;
  eta_minutes?: number;
  reason?: string;
}

export interface DeliveryAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
}

export interface DeliveryTrackingView {
  order_id: string;
  status: string;
  eta_minutes: number;
  branch: {
    id: number;
    name: string;
    city: string;
  };
  destination: Omit<DeliveryAddress, 'phone'> & {
    phone_masked: string;
  };
  rider?: {
    name: string;
    phone: string;
    lat: number;
    lng: number;
    stale: boolean;
  };
  handover_code?: string; // Only present when status === 'OUT_FOR_DELIVERY'
  history: Array<{
    status: string;
    at: string;
    note?: string;
  }>;
}

export interface ReportIssueRequest {
  reason: 'DAMAGED' | 'WRONG_PLANT' | 'DEAD_ON_ARRIVAL' | 'NOT_DELIVERED';
  note: string;
}

export interface ReportIssueResponse {
  issue_id: number;
  status: string;
}

// 5. Chatbot Types
export type ChatNavigateRoute =
  | 'home'
  | 'shop'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'account'
  | 'login'
  | 'map'
  | 'help';

export interface ChatAction {
  type: 'show_products' | 'navigate' | 'open_map' | 'show_quote' | 'show_order' | 'add_to_cart';
  payload?: {
    query?: string;
    category?: string;
    route?: ChatNavigateRoute;
    branch_id?: number;
    city?: string;
    order_id?: string;
    product_id?: number;
    [key: string]: unknown;
  };
}

export interface ChatRequest {
  message: string;
  context?: {
    city?: string;
  };
}

export interface ChatResponse {
  intent: string;
  reply: string;
  action?: ChatAction;
  suggestions?: string[];
}
