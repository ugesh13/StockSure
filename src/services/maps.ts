import { getPool } from '../db.ts';
import { cfg } from '../config.ts';
import { AppError } from '../errors.ts';

export interface NearestBranchView {
  id: number;
  name: string;
  city: string;
  address?: string;
  lat: number;
  lng: number;
  distance_km: number;
  directions_url: string;
  availability?: {
    product_id: number;
    available: number;
    status: 'IN_STOCK' | 'LAST_UNITS' | 'OUT_OF_STOCK' | 'CONFIRM_WITH_STORE';
  };
}

export interface DirectionsResult {
  branch_id: number;
  branch_name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  directions_url: string;
  distance_km: number;
  eta_minutes: number;
  mode: 'driving' | 'walking';
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
}

// 24-hour in-memory cache for geocoding queries
const geocodeCache = new Map<string, { result: GeocodeResult; expiresAt: number }>();

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function buildGoogleDirectionsUrl(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;
}

export async function findNearestBranches(
  lat: number,
  lng: number,
  limit = 5,
  productId?: number
): Promise<NearestBranchView[]> {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError(422, 'INVALID_COORDINATES', 'Latitude must be [-90, 90] and longitude [-180, 180]');
  }

  const pool = getPool();
  const branchRows = (
    await pool.query<{ id: number; name: string; city: string; lat: number; lng: number }>(
      `SELECT id, name, city, lat, lng FROM branches WHERE lat IS NOT NULL AND lng IS NOT NULL`
    )
  ).rows;

  let stockMap = new Map<number, { available: number; status: any }>();
  if (productId) {
    const invRows = (
      await pool.query<{ branch_id: number; on_hand: number; reserved: number; buffer_qty: number }>(
        `SELECT branch_id, on_hand, reserved, buffer_qty 
         FROM inventory 
         WHERE product_id = $1`,
        [productId]
      )
    ).rows;

    for (const row of invRows) {
      const avail = Math.max(0, row.on_hand - row.reserved - (row.buffer_qty || 0));
      let status: 'IN_STOCK' | 'LAST_UNITS' | 'OUT_OF_STOCK' = 'OUT_OF_STOCK';
      if (avail >= 3) status = 'IN_STOCK';
      else if (avail > 0) status = 'LAST_UNITS';
      stockMap.set(row.branch_id, { available: avail, status });
    }
  }

  const mapped: NearestBranchView[] = branchRows.map((b) => {
    const dist = haversineDistanceKm(lat, lng, Number(b.lat), Number(b.lng));
    const item: NearestBranchView = {
      id: b.id,
      name: b.name,
      city: b.city,
      lat: Number(b.lat),
      lng: Number(b.lng),
      distance_km: dist,
      directions_url: buildGoogleDirectionsUrl(lat, lng, Number(b.lat), Number(b.lng)),
    };

    if (productId) {
      const st = stockMap.get(b.id) || { available: 0, status: 'OUT_OF_STOCK' };
      item.availability = {
        product_id: productId,
        available: st.available,
        status: st.status,
      };
    }
    return item;
  });

  mapped.sort((a, b) => a.distance_km - b.distance_km);
  return mapped.slice(0, Math.min(Math.max(limit, 1), 20));
}

export async function getBranchDirections(
  branchId: number,
  fromLat: number,
  fromLng: number,
  mode: 'driving' | 'walking' = 'driving'
): Promise<DirectionsResult> {
  if (fromLat < -90 || fromLat > 90 || fromLng < -180 || fromLng > 180) {
    throw new AppError(422, 'INVALID_COORDINATES', 'Latitude must be [-90, 90] and longitude [-180, 180]');
  }

  const pool = getPool();
  const bRes = await pool.query<{ id: number; name: string; lat: number; lng: number }>(
    `SELECT id, name, lat, lng FROM branches WHERE id = $1`,
    [branchId]
  );

  if (bRes.rows.length === 0) {
    throw new AppError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
  }

  const b = bRes.rows[0];
  const toLat = Number(b.lat);
  const toLng = Number(b.lng);
  const distKm = haversineDistanceKm(fromLat, fromLng, toLat, toLng);
  const directionsUrl = buildGoogleDirectionsUrl(fromLat, fromLng, toLat, toLng);

  // Check if server Google Maps key is configured
  let serverKey = '';
  try {
    serverKey = cfg().GOOGLE_MAPS_SERVER_KEY || '';
  } catch {
    serverKey = '';
  }

  if (serverKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLat},${fromLng}&destinations=${toLat},${toLng}&mode=${mode}&key=${serverKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const element = data.rows?.[0]?.elements?.[0];
        if (element && element.status === 'OK') {
          const apiDistKm = Math.round((element.distance.value / 1000) * 100) / 100;
          const apiEtaMins = Math.round(element.duration.value / 60);
          return {
            branch_id: b.id,
            branch_name: b.name,
            origin: { lat: fromLat, lng: fromLng },
            destination: { lat: toLat, lng: toLng },
            directions_url: directionsUrl,
            distance_km: apiDistKm,
            eta_minutes: apiEtaMins,
            mode,
          };
        }
      }
    } catch {
      // Graceful fallback to haversine estimation
    }
  }

  // Fallback calculation: 30 km/h driving (~2 min/km + 3 min buffer), 5 km/h walking (~12 min/km)
  const speedKmH = mode === 'walking' ? 5 : 30;
  const etaMinutes = Math.max(1, Math.round((distKm / speedKmH) * 60) + (mode === 'driving' ? 3 : 0));

  return {
    branch_id: b.id,
    branch_name: b.name,
    origin: { lat: fromLat, lng: fromLng },
    destination: { lat: toLat, lng: toLng },
    directions_url: directionsUrl,
    distance_km: distKm,
    eta_minutes: etaMinutes,
    mode,
  };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new AppError(400, 'EMPTY_ADDRESS', 'Address string cannot be empty');
  }

  // Check in-memory 24h cache
  const cached = geocodeCache.get(trimmed.toLowerCase());
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  let serverKey = '';
  try {
    serverKey = cfg().GOOGLE_MAPS_SERVER_KEY || '';
  } catch {
    serverKey = '';
  }

  if (!serverKey) {
    throw new AppError(
      503,
      'GEO_NOT_CONFIGURED',
      'Geocoding service is not configured. Please drop a pin on the map.'
    );
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${serverKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google geocoding error: ${res.statusText}`);
    }

    const data: any = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) {
      throw new AppError(422, 'ADDRESS_NOT_LOCATABLE', 'Address could not be resolved to coordinates. Please drop a pin.');
    }

    const first = data.results[0];
    const result: GeocodeResult = {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      formatted_address: first.formatted_address,
    };

    // Store in 24h cache
    geocodeCache.set(trimmed.toLowerCase(), {
      result,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return result;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, 'GEO_PROVIDER_ERROR', `Geocoding request failed: ${err.message}`);
  }
}
