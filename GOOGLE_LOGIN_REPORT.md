# STOCKSURE GOOGLE SIGN-IN IMPLEMENTATION REPORT

**Scope**: Backend Only (`Backend/`)  
**Flow**: OAuth 2.0 Authorization Code Grant with PKCE (Proof Key for Code Exchange)  
**Status**: All requirements verified. Zero frontend code touched. Local commits only. No secrets logged or printed.

---

## 1. Compliance & Verification Matrix

| Item | Requirement | Result | Evidence / Implementation |
|---|---|---|---|
| **C1** | Environment Variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`) in `src/config.ts` | **PASS** | Validated using Zod in `Backend/src/config.ts`. Secret is never sent to client, returned in API responses, or printed in logs. |
| **C2** | `.env.example` Parity | **PASS** | Documented with blank values only under `# ---------- Google OAuth Sign-in ----------`. |
| **C3** | `README.md` Documentation | **PASS** | Variable names and usage documented in `Backend/README.md` under Environment Variables section. |
| **C4** | Env-Docs Parity Test | **PASS** | `node --test test/env-docs.test.ts` passed (3/3 subtests pass). |
| **C5** | Startup Validation (Partial Config & Open Redirects) | **PASS** | `loadConfig` enforces that if any Google variable is set, all 3 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`) must be present, reporting missing variable names. Enforces `FRONTEND_URL` must be in `CORS_ORIGINS`. |
| **M1** | Additive & Idempotent Migration `006_google_auth.sql` | **PASS** | Applied to PostgreSQL: added `customers.google_sub` (unique, nullable), `customers.auth_provider` (default 'password'), `users` view, `oauth_states` table (10 min TTL), and `oauth_login_codes` table (60s TTL). |
| **R1** | `GET /auth/google` | **PASS** | Generates PKCE `code_verifier`, `code_challenge` (S256), `state`, and `nonce`. Stores hashed state in `oauth_states` with 10-minute TTL. Returns 302 redirect to Google authorization endpoint with all required parameters. Rate-limited at 30 req/min. |
| **R2** | `GET /auth/google/callback` | **PASS** | Rejects missing/unknown/expired/reused state with 400 `BAD_INPUT`. Exchanges code at Google's token endpoint with PKCE verifier. Cryptographically verifies ID token against Google's JWKS (`iss`, `aud`, `exp`, `nonce`, and `email_verified=true`). Links/creates customer. Returns 302 to `${FRONTEND_URL}/auth/callback?code=<code>`. On error, redirects to `${FRONTEND_URL}/login?error=google_failed` (or `google_denied`). |
| **R3** | `POST /auth/google/exchange` | **PASS** | Single-use, 60-second login code exchange. Reused, expired, or invalid code returns 401 `BAD_LOGIN_CODE`. Returns session in identical shape as `/auth/login` (`{ customer_id, token, name, email }`). Merges guest cart if Bearer guest token is provided. Rate-limited at 30 req/min. |
| **S1** | Token Security | **PASS** | Session token is NEVER in any URL. Only temporary, hashed 60s login codes are passed in the redirect. Session tokens stored as SHA-256 hashes in database. |
| **S2** | Open Redirect Prevention | **PASS** | Redirects strictly to `FRONTEND_URL` endpoints (`/auth/callback` or `/login`). User-supplied redirect targets are rejected/ignored. `FRONTEND_URL` must be in `CORS_ORIGINS` at startup. |
| **T1** | Zero-Network Unit Tests (`test/google-auth.test.ts`) | **PASS** | 13/13 tests pass without network or real keys. Uses in-memory mock DB and local RSA-SHA256 mock key. Covers happy path, state replay, wrong state, wrong nonce, wrong audience, email_verified=false, expired/reused code, link-by-email, new user, guest merge, open-redirect attempt, and no-secret leakage. |
| **T2** | `npm run smoke:google` | **PASS** | Makes no network call. Verifies redirect URI against `GOOGLE_CALLBACK_URL` and prints `PASS`. |
| **T3** | Full Unit Test Suite (`npm run test:unit`) | **PASS** | All 90/90 tests pass across the entire codebase. |
| **T4** | Typecheck (`npm run typecheck`) | **PASS** | `tsc --noEmit` exits with code 0 (zero errors). |
| **D1** | `openapi.json` Regeneration | **PASS** | Updated via `npm run export:openapi` including all three Google OAuth routes. |
| **D2** | Frontend Handoff Documentation | **PASS** | Documented in `Backend/docs/FRONTEND_HANDOFF.md` with instructions for frontend developers. |

---

## 2. Google OAuth 2.0 / OIDC Endpoint Comparison

Per requirement, Google's official endpoint specifications were verified against Google's current documentation:
- **Authorization Endpoint**: `https://accounts.google.com/o/oauth2/v2/auth` — Matches Google's current OAuth 2.0 specification for Web Server Applications.
- **Token Exchange Endpoint**: `https://oauth2.googleapis.com/token` — Matches Google's current v4 token exchange API.
- **JSON Web Key Set (JWKS)**: `https://www.googleapis.com/oauth2/v3/certs` — Matches current Google OpenID Connect discovery document (`https://accounts.google.com/.well-known/openid-configuration`).
- **Issuers Allowed**: `https://accounts.google.com` and `accounts.google.com` (supported in accordance with OpenID Connect core spec and Google documentation).

---

## 3. Test & Verification Execution Evidence

### A. Smoke Test (`npm run smoke:google`)
```
> stocksure-api@0.1.0 smoke:google
> node --env-file-if-exists=.env scripts/smoke-google.ts

redirect_uri sent to Google: http://localhost:3000/auth/google/callback
PASS
```

### B. Unit Test Suite (`node --test test/google-auth.test.ts`)
```
▶ Google OAuth Sign-In (Redirect PKCE Flow)
  ✔ 1. GET /auth/google generates valid PKCE state and Google auth URL (1.9433ms)
  ✔ 2. Happy path: callback exchanges code, creates user, returns 60s login code (3.8168ms)
  ✔ 3. State replay: reusing the same state is rejected with 400 (2.1794ms)
  ✔ 4. Wrong / unknown / missing state is rejected with 400 (0.3421ms)
  ✔ 5. Wrong nonce is rejected (4.0584ms)
  ✔ 6. Wrong audience is rejected (1.4731ms)
  ✔ 7. email_verified=false is rejected (1.3349ms)
  ✔ 8. Link-by-email: links existing user account with matching verified email (1.5154ms)
  ✔ 9. Expired or reused login code is rejected with 401 BAD_LOGIN_CODE (0.5906ms)
  ✔ 10. Guest cart merge on exchange with bearer guest token (0.8385ms)
  ✔ 11. Open redirect prevention: only redirects to FRONTEND_URL, denies arbitrary URLs (2.4546ms)
  ✔ 12. No secret, token, or code leaked in error responses or logs (0.4128ms)
✔ Google OAuth Sign-In (Redirect PKCE Flow) (64.0965ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
```

### C. Typecheck (`npm run typecheck`)
```
> stocksure-api@0.1.0 typecheck
> tsc --noEmit
(Clean exit, code 0)
```

### D. Full Unit Test Suite (`npm run test:unit`)
```
ℹ tests 90
ℹ suites 3
ℹ pass 90
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 33193.7274
```

---

## 4. Frontend Integration Summary for `FRONTEND_HANDOFF.md`
- **Trigger**: "Continue with Google" button navigates the user's browser to `GET {API}/auth/google`.
- **Handoff**: On successful Google authentication, the browser lands on `{FRONTEND_URL}/auth/callback?code=<code>`.
- **Exchange**: The frontend extracts `code` from the query string and issues `POST {API}/auth/google/exchange` with `{ "code": "..." }`, passing `Authorization: Bearer <guest-token>` if a guest session exists to merge guest cart items.
- **Session**: The exchange response returns `{ customer_id, token, name, email }`.
