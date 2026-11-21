import { loadConfig, cfg } from '../src/config.ts';
import { _setPoolForTesting } from '../src/db.ts';
import { buildGoogleAuthUrl } from '../src/services/googleAuth.ts';

// 1. Mock DB pool so no network call is made
_setPoolForTesting({
  query: async () => ({ rows: [] }),
});

// 2. Ensure test configuration with Google OAuth is loaded
const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
loadConfig(['api'], {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: callbackUrl,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  STAFF_KEY: 'test-staff-key-12345',
  ADMIN_TOKEN: 'test-admin-token-12345',
});

async function main() {
  const authUrlStr = await buildGoogleAuthUrl();
  const authUrl = new URL(authUrlStr);
  const sentRedirectUri = authUrl.searchParams.get('redirect_uri');
  const expectedRedirectUri = cfg().GOOGLE_CALLBACK_URL;

  console.log(`redirect_uri sent to Google: ${sentRedirectUri}`);

  if (sentRedirectUri === expectedRedirectUri) {
    console.log('PASS');
    process.exit(0);
  } else {
    console.error(`FAIL: expected ${expectedRedirectUri}, got ${sentRedirectUri}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
