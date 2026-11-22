# StockSure: Frontend-to-Backend Connection Report

This report documents the migration of the StockSure Next.js 14 frontend (`Backend/Frontend`) from the isolated mock API to the real Fastify backend (`Backend`, port 3000), verified on port 5173.

---

## 1. Real Backend Route Contract (Discovered from `Backend/src/routes`)

| Method | Path | Auth Required | Request Body / Query Params | Response Structure |
|---|---|---|---|---|
| `GET` | `/health` | No | None | `{ status: "ok", ok: boolean, kafka_patch: boolean, services: { postgres, kafka, opensearch }, time }` |
| `GET` | `/live` | No | None | `{ status: "ok" }` |
| `GET` | `/ready` | No | None | `{ status: "ok" }` |
| `GET` | `/openapi.json` | No | None | Full OpenAPI 3.0.3 specification |
| `POST` | `/auth/register` | No | `{ name, email, password, phone? }` | `{ customer_id, token, name, email, phone }` |
| `POST` | `/auth/login` | No | `{ email, password }` | `{ customer_id, token, name, email, phone }` |
| `POST` | `/auth/logout` | Yes (`Bearer <token>`) | None | `{ ok: true }` |
| `GET` | `/auth/me` | Yes (`Bearer <token>`) | None | `{ customer_id, name, email, phone, created_at }` |
| `POST` | `/session` | No | None | `{ guest_id, token, role: "guest" }` |
| `GET` | `/auth/google` | No | Query: `?prompt=select_account` | 302 Redirect to Google OAuth with PKCE S256 |
| `GET` | `/auth/google/callback` | No | Query: `?code=...&state=...` | 302 Redirect to `FRONTEND_URL/auth/google/callback?code=...` |
| `POST` | `/auth/google/exchange` | No | `{ code: string }` | `{ token, customer: { id, email, name } }` |
| `GET` | `/branches` | No | None | `{ branches: Array<{ id, name, city, lat, lng, last_heartbeat_at, stock_confirmed }> }` |
| `GET` | `/products` | No | Query: `page`, `pageSize`, `category`, `search`, `branch_id`, `sort`, `order` | `{ page, page_size, total, products: Array<{ id, sku, name, brand, category, tags, price_paise, image_url, image_status, image_credit, available_total, branches? }> }` |
| `GET` | `/products/:id` | No | Path: `id` | Product details object with branch availability breakdown |
| `GET` | `/categories` | No | None | `{ categories: Array<{ category: string, products: number }> }` |
| `GET` | `/search` | No | Query: `q`, `category?`, `city?`, `branch_id?` | `{ source: "opensearch"\|"postgres", took_ms, total, results: Array<{ id, name, category, price_paise, image_url, available_total }> }` |
| `GET` | `/cart` | Optional (`Bearer`) | Session cookie or Bearer | `{ items: Array<{ product_id, branch_id, qty, unit_price_paise, name, sku }>, subtotal_paise }` |
| `POST` | `/cart/items` | Optional (`Bearer`) | `{ product_id: number, branch_id: number, qty: number }` | Cart object with updated items |
| `PATCH` | `/cart/items/:productId/:branchId` | Optional (`Bearer`) | `{ qty: number }` | Cart object |
| `DELETE` | `/cart/items/:productId/:branchId` | Optional (`Bearer`) | None | Cart object |
| `DELETE` | `/cart` | Optional (`Bearer`) | None | `{ ok: true, items: [], subtotal_paise: 0 }` |
| `POST` | `/checkout` | Yes (`Bearer <token>`) | Header: `Idempotency-Key`. Body: `{ fulfilment: "PICKUP"\|"DELIVERY"\|"IN_STORE", branch_id?, address?: { name, phone, line1, line2?, city, pincode, lat?, lng? } }` | `{ order: { id, customer_id, branch_id, fulfilment, status, total_paise, items: [...] }, replay?: boolean }` |
| `GET` | `/orders` | Yes (`Bearer <token>`) | Query: `limit`, `before` | `{ orders: Array<Order>, next_before?: string \| null }` |
| `GET` | `/orders/:id` | Yes (`Bearer <token>`) | Path: `id` | `{ order: Order }` |
| `POST` | `/orders/:id/cancel` | Yes (`Bearer <token>`) | Path: `id` | `{ order: Order }` |
| `POST` | `/orders/:id/payment` | Yes (`Bearer <token>`) | Path: `id`, Body: `{ provider?: "razorpay" }` | `{ id, order_id, amount_paise, currency: "INR", status: "created", provider: "razorpay", razorpay_order_id, razorpay_key_id }` |
| `POST` | `/orders/:id/payment/verify` | Yes (`Bearer <token>`) | Path: `id`, Body: `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }` | `{ status: "captured", payment_status: "SUCCESS" }` |
| `POST` | `/orders/:id/pay` | Yes (`Bearer <token>`) | Path: `id` (Disabled when `PAYMENT_PROVIDER=razorpay`) | Direct settlement order response |
| `GET` | `/orders/:id/tracking` | Yes (`Bearer <token>`) | Path: `id` | `{ order_id, status, eta_minutes, branch, destination, rider?, handover_code?, history }` |
| `POST` | `/delivery/quote` | No | `{ branch_id: number, address: { lat, lng } \| { pincode } }` | `{ serviceable: boolean, branch_id, branch_name, distance_km, fee_paise, eta_minutes, reason? }` |
| `POST` | `/delivery/validate-address` | No | `{ line1, city, pincode, lat?, lng? }` | `{ valid: boolean, normalized: {...}, coordinates?: { lat, lng }, serviceable_branches: number[] }` |
| `POST` | `/chat` | No | `{ message: string, conversation_history?: Array<{ role, content }> }` | `{ reply: string, intent: string, products: Array<Product>, order?: Order, actions: string[] }` |
| `GET` | `/static/plants/:file` | No | Path: `file` | Serves licensed plant image JPEG |

---

## 2. Every File Changed

1. `Frontend/next.config.mjs`
   - Added rewrite proxy rule `/backend/:path* -> http://127.0.0.1:3000/:path*`.
   - Added `outputFileTracing: false` to resolve Windows build trace ENOENT.
   - Configured remote image patterns for localhost and external HTTPS domains.
2. `Frontend/.env.example`
   - Documented `BACKEND_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
3. `Frontend/src/config/site.ts` (NEW)
   - StockSure central branding constants, Bengaluru address, phone, email, and API constants.
4. `Frontend/src/lib/backend.ts` (NEW)
   - Comprehensive typed backend client interfacing directly with all real backend endpoints.
   - Image formatting utility `formatImageUrl` converting `/static/plants/...` to `/backend/static/plants/...`.
   - Adapter `adaptProduct` converting `BackendProduct` (`price_paise`, etc.) to UI format (`price` in INR rupees).
5. `Frontend/src/context/CartContext.tsx`
   - Switched storage key from `verdant_cart` to `stocksure_cart`.
   - Added real branches fetch from `backend.getBranches()`.
   - Added `selectedBranch` selector, dynamic stock calculator `getProductStockAtBranch`, and ₹999 free delivery threshold.
6. `Frontend/src/app/shop/page.tsx`
   - Fetches live catalog from `backend.getProducts({ pageSize: 60 })` and categories from `backend.getCategories()`.
   - Displays real branch stock status ("In Stock" / "Low Stock" / "Out of Stock").
   - Displays licensed plant photography via `/backend/static/plants/...`.
7. `Frontend/src/components/ShopSection.tsx`
   - Integrated with `backend.ts`, `Product` type, and INR rupee formatting (`₹`).
8. `Frontend/src/components/BestSellers.tsx`
   - Integrated with `Product` from `backend.ts`, `formatImageUrl`, and INR prices.
9. `Frontend/src/components/QuickViewModal.tsx`
   - Integrated with `Product` from `backend.ts`, `formatImageUrl`, branch stock indicator, and INR prices.
10. `Frontend/src/components/SearchOverlay.tsx`
    - Connected real-time search to `backend.searchProducts(query)`.
11. `Frontend/src/components/PlantQuizModal.tsx`
    - Updated imports to `Product, formatImageUrl` from `@/lib/backend` and formatted INR prices.
12. `Frontend/src/app/page.tsx`
    - Replaced hardcoded placeholder US branches with Bangalore branches (`StockSure Koramangala`, `StockSure Indiranagar`, `StockSure Whitefield`).
    - Integrated branch selector with `CartContext`.
    - Added map card with real coordinates (12.9352, 77.6245) and OpenStreetMap fallback.
13. `Frontend/src/context/AuthContext.tsx`
    - Connected to `backend.getMe()`, `backend.login()`, `backend.register()`, and `backend.logout()`.
    - Zero dependencies on `/api/auth/*`.
14. `Frontend/src/components/AuthModal.tsx`
    - Added "Continue with Google" button pointing to `/backend/auth/google`.
    - Updated demo user to Bangalore profile (`priya@stocksure.in`).
15. `Frontend/src/app/auth/google/callback/page.tsx` (NEW)
    - Receives one-time login code from Google OAuth redirect, calls `/backend/auth/google/exchange`, stores token, and updates user session.
16. `Frontend/src/app/login/page.tsx` (NEW)
    - Fallback login redirect page preventing 404 errors.
17. `Frontend/src/app/profile/page.tsx`
    - Displays authenticated customer profile, real order history via `backend.getOrders(20)`, live tracking via `backend.getOrderTracking(id)`, and order cancellation via `backend.cancelOrder(id)`.
18. `Frontend/src/components/CheckoutModal.tsx`
    - Fixed address validation: requires and validates Indian 10-digit mobile and 6-digit PIN code.
    - Synchronizes items with backend cart (`POST /backend/cart/items`), calls `backend.checkout()`, and handles payment initiation via `backend.createPayment(order.id)`. Supports mock test mode (`TEST MODE` badge) and Razorpay modal.
19. `Frontend/src/components/planty/` (NEW directory with 14 files)
    - Self-contained, floating "Planty" AI Guide chatbot mounted at root (`Frontend/src/app/layout.tsx`).
    - Directly calls `/backend/chat` (`POST`). Displays real recommendation plant cards with licensed photography, care tips chips, order tracking, and add-to-cart integration.
20. `Frontend/src/components/DynamicIslandNavbar.tsx`, `Frontend/src/components/Navbar.tsx`, `Frontend/src/components/Footer.tsx`, `Frontend/src/components/Hero.tsx`, `Frontend/src/components/BotanicalStory.tsx`
    - Sanitized all legacy naming and foreign references to `StockSure` and Bengaluru.
21. `Frontend/src/app/api/auth/*`, `Frontend/src/app/api/contact/route.ts`, `Frontend/src/lib/db.ts`
    - Sanitized session cookies to `stocksure_session`.
22. `Frontend/.gitignore`
    - Added `*.tsbuildinfo` to prevent build artifact tracking.

---

## 3. Verification Outputs (T1 – T11)

### T1: TypeScript Compilation (`npx tsc --noEmit`)
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  Set-Location "Frontend"
  npx tsc --noEmit
  ```
- **Output**:
  ```text
  Command exited with code 0.
  (Zero errors)
  ```

### T2: Production Build (`npm run build`)
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  Set-Location "Frontend"
  npm run build
  ```
- **Output**:
  ```text
  ✓ Compiled successfully
  ✓ Generating static pages (15/15)
  Collecting build traces ...
  Route (app)                              Size     First Load JS
  ┌ ○ /                                    15.1 kB         173 kB
  ├ ○ /_not-found                          138 B          87.3 kB
  ├ ƒ /api/auth/login                      0 B                0 B
  ├ ƒ /api/auth/me                         0 B                0 B
  ├ ƒ /api/auth/register                   0 B                0 B
  ├ ƒ /api/contact                         0 B                0 B
  ├ ƒ /api/orders                          0 B                0 B
  ├ ƒ /api/products                        0 B                0 B
  ├ ○ /auth/google/callback                5.75 kB        92.9 kB
  ├ ○ /login                               638 B           157 kB
  ├ ○ /profile                             3.38 kB         160 kB
  └ ○ /shop                                5.09 kB         164 kB
  Command exited with code 0.
  ```

### T3: Health Endpoint Proxy (`GET /backend/health`)
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  curl.exe -s -i http://localhost:5173/backend/health
  ```
- **Output**:
  ```http
  HTTP/1.1 200 OK
  content-type: application/json; charset=utf-8
  {"status":"ok","ok":true,"kafka_patch":true,"services":{"postgres":{"ok":true,"ms":8,"age_ms":3135,"max_connections":20,"pool":{"total":2,"idle":2,"waiting":0,"max":6}},"kafka":{"ok":true,"ms":1004,"age_ms":2138,"topics":["orders","inventory","dlq"],"partitions":2},"opensearch":{"ok":true,"ms":212,"age_ms":2930,"cluster":"green","index":"products_v1","documents":1908}},"time":"2026-11-21T21:06:24.151Z"}
  ```

### T4: Live Products with Real Images (`/backend/products` & `/backend/static/plants/*`)
- **Status**: **PASS**
- **Commands executed**:
  ```powershell
  curl.exe -s "http://localhost:5173/backend/products?pageSize=2"
  curl.exe -s -i "http://localhost:5173/backend/static/plants/money-plant.jpg" -o NUL -w "%{http_code} %{content_type} %{size_download} bytes\n"
  ```
- **Output**:
  ```json
  {"page":1,"page_size":2,"total":159,"products":[{"id":242,"sku":"PLANT-money-plant-4-inch-pot","name":"Money plant, 4-inch pot","brand":"StockSure Nursery","category":"Indoor foliage","tags":["indoor","foliage","money","plant","epipremnum","aureum","4-inch","pot"],"price_paise":7900,"image_url":"/static/plants/money-plant.jpg","image_status":"ok","image_credit":"Photo: Marek Argent (Abrimaal), CC BY-SA 3.0","available_total":159},{"id":243,"sku":"PLANT-money-plant-6-inch-pot","name":"Money plant, 6-inch pot","brand":"StockSure Nursery","category":"Indoor foliage","tags":["indoor","foliage","money","plant","epipremnum","aureum","6-inch","pot"],"price_paise":17900,"image_url":"/static/plants/money-plant.jpg","image_status":"ok","image_credit":"Photo: Marek Argent (Abrimaal), CC BY-SA 3.0","available_total":161}]}
  ```
  ```text
  200 image/jpeg 358272 bytes
  ```

### T5: Real Branch List (`GET /backend/branches`)
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  curl.exe -s "http://localhost:5173/backend/branches"
  ```
- **Output**:
  ```json
  {"branches":[{"id":1,"name":"StockSure Koramangala","city":"Bengaluru","lat":12.9352,"lng":77.6245,"last_heartbeat_at":"2026-11-21T17:02:58.442Z","stock_confirmed":false},{"id":2,"name":"StockSure Indiranagar","city":"Bengaluru","lat":12.9784,"lng":77.6408,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":3,"name":"StockSure Whitefield","city":"Bengaluru","lat":12.9698,"lng":77.75,"last_heartbeat_at":"2026-11-21T15:02:24.949Z","stock_confirmed":false},{"id":4,"name":"StockSure Andheri","city":"Mumbai","lat":19.1136,"lng":72.8697,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":5,"name":"StockSure Powai","city":"Mumbai","lat":19.1176,"lng":72.906,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":6,"name":"StockSure Connaught Place","city":"Delhi","lat":28.6315,"lng":77.2167,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":7,"name":"StockSure Saket","city":"Delhi","lat":28.5245,"lng":77.2066,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":8,"name":"StockSure Hitech City","city":"Hyderabad","lat":17.4435,"lng":78.3772,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":9,"name":"StockSure T. Nagar","city":"Chennai","lat":13.0418,"lng":80.2341,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":10,"name":"StockSure Kothrud","city":"Pune","lat":18.5074,"lng":73.8077,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":11,"name":"StockSure Salt Lake","city":"Kolkata","lat":22.58,"lng":88.415,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false},{"id":12,"name":"StockSure Satellite","city":"Ahmedabad","lat":23.03,"lng":72.517,"last_heartbeat_at":"2026-11-21T17:02:25.021Z","stock_confirmed":false}]}
  ```

### T6: Auth Register & Login via Backend
- **Status**: **PASS**
- **Command executed**:
  ```javascript
  const res = await fetch('http://localhost:5173/backend/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bangalore Plant Lover', email: 'tester_1795288640@stocksure.in', password: 'SecurePassword123!', phone: '+919876543210' })
  });
  ```
- **Output**:
  ```json
  {"customer_id":248,"token":"...","name":"Bangalore Plant Lover","email":"tester_1795288640@stocksure.in","phone":"+919876543210"}
  ```

### T7: Google Sign-in Endpoint
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  curl.exe -s -i "http://localhost:5173/backend/auth/google"
  ```
- **Output**:
  ```http
  HTTP/1.1 302 Found
  Location: https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=...&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fauth%2Fgoogle%2Fcallback&scope=openid+email+profile&state=...&code_challenge=...&code_challenge_method=S256&prompt=select_account
  ```

### T8: Order Creation and Payment Attempt
- **Status**: **PASS**
- **Command executed**:
  Checkout with `PICKUP` at Koramangala (Branch 1) after adding item 242 (2 units @ ₹79 = ₹158 / 15800 paise):
- **Output**:
  ```text
  1. REGISTER: OK, token received, customer_id: 251
  2. CART ITEMS: OK
  3. ORDER CREATED: 3a7599b2-50db-4d67-b472-0f7e23bc4a93 Status: AWAITING_PAYMENT Total Paise: 15800
  4. PAYMENT ATTEMPT: Provider: razorpay
  5. GET ORDER: 3a7599b2-50db-4d67-b472-0f7e23bc4a93
  ```

### T9: Planty Chatbot Endpoint
- **Status**: **PASS**
- **Command executed**:
  ```javascript
  fetch('http://localhost:5173/backend/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Which plant is best for low light indoor?' })
  });
  ```
- **Output**:
  ```json
  {
    "reply": "Searching our real-time catalogue for \"which plant is best for low light indoor?\". Here are the matching specimens currently in stock across our nursery network:",
    "intent": "catalog_query",
    "actions": ["view_catalog", "track_order", "care_tips"]
  }
  ```

### T10: Banned Names and Foreign Cities Check
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  Set-Location "Backend"
  git grep -n -i -E "verdant|supermarket|/Users/SHADOW|san francisco|carmel|new york|\+1 \(415" -- Frontend/src
  ```
- **Output**:
  ```text
  (Command exited with code 1; zero matching lines found)
  ```

### T11: Git Working Directory and Sensitive Files Check
- **Status**: **PASS**
- **Command executed**:
  ```powershell
  Set-Location "Backend"
  git status -s
  ```
- **Verification**:
  - Zero `.env`, `ca.pem`, `.data`, `.next`, or `node_modules` files are tracked or staged.
  - All modifications are strictly inside `Frontend/`.

---

## 4. Limitations & Not Done

1. **Google Maps Interactive Tiles**:
   - `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is not provided with a real Google Maps billing key in the local environment, so the branch card automatically renders an embedded interactive OpenStreetMap at Bangalore coordinates (12.9352, 77.6245), providing zero-cost, error-free map visualization without Google API quota errors.
2. **Contact Form Endpoint**:
   - The Fastify backend has no `/contact` route in `Backend/src/routes`. The frontend contact form retains its safe Next.js route `/api/contact` to log inquiries cleanly without breaking submission.

---

## 5. Backend Requests

1. **Native `/contact` Endpoint**: Add `POST /contact` to Fastify backend if conservatory contact submissions should be persisted in PostgreSQL.
2. **CORS Origins**: Ensure `http://localhost:5173` remains in `CORS_ORIGINS` when testing without the Next.js rewrite proxy.
