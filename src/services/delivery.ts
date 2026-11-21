import crypto from 'node:crypto';
import { getPool } from '../db.ts';
import { cfg } from '../config.ts';
import { AppError } from '../errors.ts';
import { findNearestBranches, haversineDistanceKm } from './maps.ts';

export interface DeliveryQuoteResult {
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
  branch: { id: number; name: string; city: string };
  destination: Omit<DeliveryAddress, 'phone'> & { phone_masked: string };
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

export function validateDeliveryAddress(addr: any): DeliveryAddress {
  if (!addr || typeof addr !== 'object') {
    throw new AppError(422, 'INVALID_ADDRESS', 'Delivery address object is required');
  }

  const name = typeof addr.name === 'string' ? addr.name.trim() : '';
  if (!name || name.length > 100) {
    throw new AppError(422, 'INVALID_NAME', 'Recipient name is required (max 100 characters)');
  }

  const phone = typeof addr.phone === 'string' ? addr.phone.trim() : '';
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new AppError(422, 'INVALID_PHONE', 'Recipient phone must be a 10-digit Indian mobile number');
  }

  const line1 = typeof addr.line1 === 'string' ? addr.line1.trim() : '';
  if (!line1 || line1.length > 200) {
    throw new AppError(422, 'INVALID_LINE1', 'Address line 1 is required (max 200 characters)');
  }

  const line2 = typeof addr.line2 === 'string' ? addr.line2.trim() : undefined;
  const city = typeof addr.city === 'string' ? addr.city.trim() : '';
  if (!city || city.length > 100) {
    throw new AppError(422, 'INVALID_CITY', 'City is required');
  }

  const pincode = typeof addr.pincode === 'string' ? addr.pincode.trim() : '';
  if (!/^\d{6}$/.test(pincode)) {
    throw new AppError(422, 'INVALID_PINCODE', 'Pincode must be a 6-digit Indian postal code');
  }

  const lat = Number(addr.lat);
  const lng = Number(addr.lng);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError(422, 'ADDRESS_NOT_LOCATABLE', 'Valid delivery coordinates (lat/lng) are required');
  }

  return { name, phone, line1, line2, city, pincode, lat, lng };
}

export async function getDeliveryQuote(
  lat: number,
  lng: number,
  amountPaise = 0
): Promise<DeliveryQuoteResult> {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError(422, 'INVALID_COORDINATES', 'Latitude must be [-90, 90] and longitude [-180, 180]');
  }

  const branches = await findNearestBranches(lat, lng, 1);
  if (branches.length === 0) {
    return { serviceable: false, reason: 'No active fulfillment branches found' };
  }

  const nearest = branches[0];
  const distKm = nearest.distance_km;

  let maxKm = 25;
  let freeAbove = 99900;
  let baseFee = 4900;
  let perKm = 1500;

  try {
    const c = cfg();
    maxKm = c.DELIVERY_MAX_KM || 25;
    freeAbove = (c.FREE_DELIVERY_ABOVE || 999) * (c.FREE_DELIVERY_ABOVE > 10000 ? 1 : 100);
    baseFee = (c.DELIVERY_BASE_FEE || 40) * (c.DELIVERY_BASE_FEE > 1000 ? 1 : 100);
    perKm = (c.DELIVERY_PER_KM || 8) * (c.DELIVERY_PER_KM > 1000 ? 1 : 100);
  } catch {
    // defaults
  }

  if (distKm > maxKm) {
    return {
      serviceable: false,
      distance_km: distKm,
      reason: `Distance (${distKm} km) exceeds maximum service radius of ${maxKm} km. Please select store pickup.`,
    };
  }

  const isFree = amountPaise >= freeAbove;
  const feePaise = isFree ? 0 : baseFee + Math.round(distKm * perKm);
  const etaMinutes = Math.round((distKm / 25) * 60) + 15; // 25km/h avg + 15 min packing

  return {
    serviceable: true,
    branch_id: nearest.id,
    branch_name: nearest.name,
    distance_km: distKm,
    fee_paise: feePaise,
    eta_minutes: etaMinutes,
  };
}

export async function createDeliveryRecord(
  orderId: string,
  branchId: number,
  address: DeliveryAddress,
  distanceKm: number,
  feePaise: number
): Promise<{ handover_code: string }> {
  const pool = getPool();

  // Generate 4-digit numeric handover verification code
  const handoverCode = String(Math.floor(1000 + Math.random() * 9000));
  const handoverHash = crypto.createHash('sha256').update(handoverCode).digest('hex');

  const etaAt = new Date(Date.now() + 45 * 60 * 1000);

  const res = await pool.query(
    `INSERT INTO deliveries (
      order_id, branch_id, address, distance_km, fee_paise, status, handover_code_hash, handover_code, eta_at
    ) VALUES ($1, $2, $3, $4, $5, 'PENDING_PAYMENT', $6, $7, $8)
    RETURNING id`,
    [orderId, branchId, JSON.stringify(address), distanceKm, feePaise, handoverHash, handoverCode, etaAt]
  );

  const deliveryId = res.rows[0].id;
  await pool.query(
    `INSERT INTO delivery_events (delivery_id, status, note) VALUES ($1, 'PENDING_PAYMENT', 'Order awaiting payment')`,
    [deliveryId]
  );

  return { handover_code: handoverCode };
}

export async function getOrderTracking(orderId: string, customerId: number): Promise<DeliveryTrackingView> {
  const pool = getPool();

  // 1. IDOR check
  const orderRes = await pool.query(
    `SELECT id, customer_id, fulfilment FROM orders WHERE id = $1`,
    [orderId]
  );

  if (orderRes.rows.length === 0 || orderRes.rows[0].customer_id !== customerId) {
    const err = new Error('Order not found');
    (err as any).status = 404;
    (err as any).code = 'ORDER_NOT_FOUND';
    throw err;
  }

  const dRes = await pool.query(
    `SELECT d.*, b.name AS branch_name, b.city AS branch_city 
     FROM deliveries d
     JOIN branches b ON b.id = d.branch_id
     WHERE d.order_id = $1`,
    [orderId]
  );

  if (dRes.rows.length === 0) {
    const err = new Error('No delivery record found for this order');
    (err as any).status = 404;
    (err as any).code = 'DELIVERY_NOT_FOUND';
    throw err;
  }

  const del = dRes.rows[0];
  const events = (
    await pool.query<{ status: string; at: Date; note?: string }>(
      `SELECT status, at, note FROM delivery_events WHERE delivery_id = $1 ORDER BY at ASC`,
      [del.id]
    )
  ).rows;

  const rawAddr: DeliveryAddress = typeof del.address === 'string' ? JSON.parse(del.address) : del.address;
  const phoneMasked = rawAddr.phone ? rawAddr.phone.slice(0, 3) + '****' + rawAddr.phone.slice(7) : '';

  let rider: any = undefined;
  if (del.rider_name) {
    const stale = del.rider_updated_at
      ? Date.now() - new Date(del.rider_updated_at).getTime() > 5 * 60 * 1000
      : true;
    rider = {
      name: del.rider_name,
      phone: del.rider_phone,
      lat: Number(del.rider_lat) || 0,
      lng: Number(del.rider_lng) || 0,
      stale,
    };
  }

  // Calculate remaining ETA minutes
  let remainingEta = 0;
  if (del.eta_at) {
    const diffMs = new Date(del.eta_at).getTime() - Date.now();
    remainingEta = Math.max(0, Math.round(diffMs / (60 * 1000)));
  }

  const result: DeliveryTrackingView = {
    order_id: orderId,
    status: del.status,
    eta_minutes: remainingEta,
    branch: {
      id: del.branch_id,
      name: del.branch_name,
      city: del.branch_city,
    },
    destination: {
      name: rawAddr.name,
      line1: rawAddr.line1,
      line2: rawAddr.line2,
      city: rawAddr.city,
      pincode: rawAddr.pincode,
      lat: rawAddr.lat,
      lng: rawAddr.lng,
      phone_masked: phoneMasked,
    },
    rider,
    history: events.map((e) => ({
      status: e.status,
      at: e.at.toISOString(),
      note: e.note || undefined,
    })),
  };

  // Security rule: handover_code is returned ONLY when status === 'OUT_FOR_DELIVERY'
  if (del.status === 'OUT_FOR_DELIVERY' && del.handover_code) {
    result.handover_code = del.handover_code;
  }

  return result;
}

const ALLOWED_DELIVERY_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_ATTEMPT', 'RETURNED'],
  FAILED_ATTEMPT: ['OUT_FOR_DELIVERY', 'RETURNED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export async function updateDeliveryStatus(
  orderId: string,
  newStatus: string,
  note?: string,
  handoverCode?: string
): Promise<{ updated: boolean; status: string }> {
  const pool = getPool();

  const dRes = await pool.query(
    `SELECT id, status, handover_code_hash FROM deliveries WHERE order_id = $1`,
    [orderId]
  );

  if (dRes.rows.length === 0) {
    const err = new Error('Delivery not found');
    (err as any).status = 404;
    (err as any).code = 'DELIVERY_NOT_FOUND';
    throw err;
  }

  const delivery = dRes.rows[0];
  const allowed = ALLOWED_DELIVERY_TRANSITIONS[delivery.status] || [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Cannot transition delivery from ${delivery.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`
    );
    (err as any).status = 400;
    (err as any).code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }

  // Handover code check on delivery
  if (newStatus === 'DELIVERED') {
    if (!handoverCode) {
      const err = new Error('4-digit handover verification code is required to complete delivery');
      (err as any).status = 400;
      (err as any).code = 'MISSING_HANDOVER_CODE';
      throw err;
    }

    const providedHash = crypto.createHash('sha256').update(handoverCode.trim()).digest('hex');
    if (
      !delivery.handover_code_hash ||
      providedHash.length !== delivery.handover_code_hash.length ||
      !crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(delivery.handover_code_hash))
    ) {
      const err = new Error('Invalid 4-digit handover verification code');
      (err as any).status = 400;
      (err as any).code = 'INVALID_HANDOVER_CODE';
      throw err;
    }
  }

  await pool.query(
    `UPDATE deliveries SET status = $1 WHERE id = $2`,
    [newStatus, delivery.id]
  );

  await pool.query(
    `INSERT INTO delivery_events (delivery_id, status, note) VALUES ($1, $2, $3)`,
    [delivery.id, newStatus, note || null]
  );

  if (newStatus === 'DELIVERED') {
    await pool.query(
      `UPDATE orders SET finalized_at = now() WHERE id = $1`,
      [orderId]
    );
  }

  return { updated: true, status: newStatus };
}

export async function updateDeliveryLocation(
  orderId: string,
  lat: number,
  lng: number,
  riderName?: string,
  riderPhone?: string
): Promise<{ updated: boolean }> {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError(422, 'INVALID_COORDINATES', 'Latitude must be [-90, 90] and longitude [-180, 180]');
  }

  const pool = getPool();
  const res = await pool.query(
    `UPDATE deliveries 
     SET rider_lat = $1, 
         rider_lng = $2, 
         rider_updated_at = now(),
         rider_name = COALESCE($3, rider_name),
         rider_phone = COALESCE($4, rider_phone)
     WHERE order_id = $5
     RETURNING id`,
    [lat, lng, riderName || null, riderPhone || null, orderId]
  );

  if (res.rows.length === 0) {
    const err = new Error('Delivery not found');
    (err as any).status = 404;
    (err as any).code = 'DELIVERY_NOT_FOUND';
    throw err;
  }

  return { updated: true };
}

export async function reportOrderIssue(
  orderId: string,
  customerId: number,
  reason: 'DAMAGED' | 'WRONG_PLANT' | 'DEAD_ON_ARRIVAL' | 'NOT_DELIVERED',
  note: string
): Promise<{ issue_id: number; status: string }> {
  const allowedReasons = ['DAMAGED', 'WRONG_PLANT', 'DEAD_ON_ARRIVAL', 'NOT_DELIVERED'];
  if (!allowedReasons.includes(reason)) {
    throw new AppError(422, 'INVALID_REASON', `Reason must be one of: ${allowedReasons.join(', ')}`);
  }

  const pool = getPool();

  // IDOR check
  const orderRes = await pool.query(
    `SELECT id, customer_id, created_at FROM orders WHERE id = $1`,
    [orderId]
  );

  if (orderRes.rows.length === 0 || orderRes.rows[0].customer_id !== customerId) {
    const err = new Error('Order not found');
    (err as any).status = 404;
    (err as any).code = 'ORDER_NOT_FOUND';
    throw err;
  }

  const order = orderRes.rows[0];
  const orderAgeHours = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);

  // 48-hour issue reporting window
  if (orderAgeHours > 48) {
    throw new AppError(400, 'ISSUE_WINDOW_EXPIRED', 'Issues can only be reported within 48 hours of order placement/delivery');
  }

  const res = await pool.query(
    `INSERT INTO order_issues (order_id, customer_id, reason, note) 
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [orderId, customerId, reason, note.trim()]
  );

  return { issue_id: res.rows[0].id, status: 'RECEIVED' };
}
