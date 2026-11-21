import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistanceKm, findNearestBranches, getBranchDirections, geocodeAddress } from '../src/services/maps.ts';
import { loadConfigOrExit } from '../src/config.ts';

loadConfigOrExit(['pg']);

describe('P1-MAP Maps & Nearest Branch Unit Tests', () => {
  it('1. Haversine distance calculates accurate geodesic distance between coordinates', () => {
    // Bangalore Koramangala (12.9352, 77.6245) to Indiranagar (12.9719, 77.6412) ~ 4.4 km
    const dist = haversineDistanceKm(12.9352, 77.6245, 12.9719, 77.6412);
    assert.ok(dist >= 4.0 && dist <= 5.0, `Expected ~4.4km, got ${dist}`);

    // Same point is 0 km
    const zero = haversineDistanceKm(12.9352, 77.6245, 12.9352, 77.6245);
    assert.equal(zero, 0);
  });

  it('2. Invalid coordinates outside [-90, 90] or [-180, 180] are rejected with 422', async () => {
    await assert.rejects(
      async () => {
        await findNearestBranches(95, 77.62); // lat > 90
      },
      (err: any) => err.status === 422 && err.code === 'INVALID_COORDINATES'
    );

    await assert.rejects(
      async () => {
        await getBranchDirections(1, 12.9, 195); // lng > 180
      },
      (err: any) => err.status === 422 && err.code === 'INVALID_COORDINATES'
    );
  });

  it('3. findNearestBranches returns branches ordered by distance with Google directions URL', async () => {
    // Search from Bangalore Central (12.9716, 77.5946)
    const branches = await findNearestBranches(12.9716, 77.5946, 3);
    assert.ok(branches.length > 0 && branches.length <= 3);

    // Verify distance sorting
    for (let i = 1; i < branches.length; i++) {
      assert.ok(branches[i].distance_km >= branches[i - 1].distance_km);
    }

    // Verify properties
    const first = branches[0];
    assert.ok(first.id > 0);
    assert.ok(first.name);
    assert.ok(first.city);
    assert.ok(first.directions_url.includes('google.com/maps/dir'));
    assert.ok(first.directions_url.includes('12.9716,77.5946'));
  });

  it('4. Branch directions calculates distance, ETA and directions URL safely without leaking server key', async () => {
    const directions = await getBranchDirections(1, 12.9716, 77.5946, 'driving');
    assert.equal(directions.branch_id, 1);
    assert.ok(directions.distance_km > 0);
    assert.ok(directions.eta_minutes > 0);
    assert.equal(directions.mode, 'driving');
    assert.ok(directions.directions_url.startsWith('https://www.google.com/maps/dir'));
    // Ensure no key is leaked
    assert.equal((directions as any).key, undefined);
    assert.equal((directions as any).apiKey, undefined);
  });

  it('5. geocodeAddress returns 503 GEO_NOT_CONFIGURED when GOOGLE_MAPS_SERVER_KEY is missing', async () => {
    await assert.rejects(
      async () => {
        await geocodeAddress('MG Road, Bangalore');
      },
      (err: any) => err.status === 503 && err.code === 'GEO_NOT_CONFIGURED'
    );
  });
});
