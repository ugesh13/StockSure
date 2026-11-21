import crypto from 'node:crypto';
import { cfg } from '../config.ts';

export interface CreateOrderParams {
  orderId: string;
  amountPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  provider: string;
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

export interface VerifySignatureParams {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface WebhookVerifyParams {
  rawBody: string | Buffer;
  signatureHeader: string;
  secret?: string;
}

export interface WebhookVerifyResult {
  isValid: boolean;
  event?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountPaise?: number;
  payload?: any;
}

export interface FetchPaymentResult {
  status: 'captured' | 'failed' | 'authorized' | 'refunded' | 'created';
  amountPaise: number;
  method?: string;
  capturedAt?: Date;
}

export interface RefundParams {
  providerPaymentId: string;
  amountPaise?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
  amountPaise: number;
}

export interface PaymentProvider {
  name: string;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  verifySignature(params: VerifySignatureParams): boolean;
  verifyWebhook(params: WebhookVerifyParams): WebhookVerifyResult;
  fetchPayment(providerPaymentId: string): Promise<FetchPaymentResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}

/**
 * Mock deterministic payment provider for automated tests and judge-demo
 */
export class MockProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly secret = 'mock_secret_key_12345';
  readonly keyId = 'mock_key_id';

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const providerOrderId = `mock_order_${params.orderId.replace(/-/g, '').slice(0, 16)}`;
    return {
      provider: 'mock',
      providerOrderId,
      amountPaise: params.amountPaise,
      currency: params.currency || 'INR',
      keyId: this.keyId,
    };
  }

  generateSignature(providerOrderId: string, providerPaymentId: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
  }

  verifySignature(params: VerifySignatureParams): boolean {
    if (!params.signature || !params.providerOrderId || !params.providerPaymentId) {
      return false;
    }
    const expected = this.generateSignature(params.providerOrderId, params.providerPaymentId);
    if (expected.length !== params.signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  }

  generateWebhookSignature(rawBody: string | Buffer): string {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    return crypto.createHmac('sha256', this.secret).update(bodyStr).digest('hex');
  }

  verifyWebhook(params: WebhookVerifyParams): WebhookVerifyResult {
    const secret = params.secret || this.secret;
    const bodyStr = typeof params.rawBody === 'string' ? params.rawBody : params.rawBody.toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    if (
      !params.signatureHeader ||
      expected.length !== params.signatureHeader.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signatureHeader))
    ) {
      return { isValid: false };
    }

    try {
      const parsed = JSON.parse(bodyStr);
      const entity = parsed.payload?.payment?.entity;
      return {
        isValid: true,
        event: parsed.event,
        providerOrderId: entity?.order_id,
        providerPaymentId: entity?.id,
        amountPaise: entity?.amount,
        payload: parsed,
      };
    } catch {
      return { isValid: false };
    }
  }

  async fetchPayment(providerPaymentId: string): Promise<FetchPaymentResult> {
    return {
      status: 'captured',
      amountPaise: 10000,
      method: 'upi',
      capturedAt: new Date(),
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      refundId: `mock_rfnd_${Date.now()}`,
      status: 'processed',
      amountPaise: params.amountPaise || 0,
    };
  }
}

/**
 * Razorpay REST Provider (Live / Test mode via fetch)
 */
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  private get keyId(): string {
    try { return cfg().RAZORPAY_KEY_ID || ''; } catch { return ''; }
  }

  private get keySecret(): string {
    try { return cfg().RAZORPAY_KEY_SECRET || ''; } catch { return ''; }
  }

  private get webhookSecret(): string {
    try { return cfg().RAZORPAY_WEBHOOK_SECRET || ''; } catch { return ''; }
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay keys not configured');
    }

    const payload = {
      amount: params.amountPaise,
      currency: params.currency || 'INR',
      receipt: (params.receipt || params.orderId).slice(0, 40),
      notes: params.notes,
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (e: any) {
      const err = new Error(`Payment provider network failure: ${e.message}`);
      (err as any).statusCode = 502;
      (err as any).code = 'PAYMENT_PROVIDER_UNAVAILABLE';
      throw err;
    }

    if (!res.ok) {
      const errText = await res.text();
      const err = new Error(`Razorpay order creation failed: ${errText}`);
      (err as any).statusCode = res.status === 502 || res.status === 504 ? 502 : 400;
      (err as any).code = (err as any).statusCode === 502 ? 'PAYMENT_PROVIDER_UNAVAILABLE' : 'PAYMENT_ORDER_FAILED';
      throw err;
    }

    const data: any = await res.json();
    return {
      provider: 'razorpay',
      providerOrderId: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      keyId: this.keyId,
    };
  }

  verifySignature(params: VerifySignatureParams): boolean {
    if (!params.signature || !params.providerOrderId || !params.providerPaymentId) {
      return false;
    }
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${params.providerOrderId}|${params.providerPaymentId}`)
      .digest('hex');

    if (expected.length !== params.signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  }

  verifyWebhook(params: WebhookVerifyParams): WebhookVerifyResult {
    const secret = params.secret || this.webhookSecret;
    if (!secret) {
      return { isValid: false };
    }
    const bodyStr = typeof params.rawBody === 'string' ? params.rawBody : params.rawBody.toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    if (
      !params.signatureHeader ||
      expected.length !== params.signatureHeader.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signatureHeader))
    ) {
      return { isValid: false };
    }

    try {
      const parsed = JSON.parse(bodyStr);
      const entity = parsed.payload?.payment?.entity;
      return {
        isValid: true,
        event: parsed.event,
        providerOrderId: entity?.order_id,
        providerPaymentId: entity?.id,
        amountPaise: entity?.amount,
        payload: parsed,
      };
    } catch {
      return { isValid: false };
    }
  }

  async fetchPayment(providerPaymentId: string): Promise<FetchPaymentResult> {
    const res = await fetch(`${this.baseUrl}/payments/${providerPaymentId}`, {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch Razorpay payment: ${res.statusText}`);
    }
    const data: any = await res.json();
    return {
      status: data.status,
      amountPaise: data.amount,
      method: data.method,
      capturedAt: data.captured_at ? new Date(data.captured_at * 1000) : undefined,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const body: any = {};
    if (params.amountPaise) body.amount = params.amountPaise;
    if (params.reason) body.notes = { reason: params.reason };

    const res = await fetch(`${this.baseUrl}/payments/${params.providerPaymentId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay refund failed: ${errText}`);
    }

    const data: any = await res.json();
    return {
      refundId: data.id,
      status: data.status,
      amountPaise: data.amount,
    };
  }
}

export function getPaymentProvider(providerName?: string): PaymentProvider {
  let defaultProv = 'mock';
  try {
    defaultProv = cfg().PAYMENT_PROVIDER || 'mock';
  } catch {
    defaultProv = 'mock';
  }
  const chosen = (providerName || defaultProv).toLowerCase();
  if (chosen === 'razorpay') {
    return new RazorpayProvider();
  }
  return new MockProvider();
}
