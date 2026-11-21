# StockSure: Frontend Handoff Contract

Official API integration specification for the frontend application.
Source of truth: `openapi.json`. Money is always integer **paise** (1 Rupee = 100 paise). Never use floating-point numbers for money.

---

## 0. Connecting to the Backend

- **API Base URL**: Configured via an environment variable (e.g. `VITE_API_URL=http://localhost:3000`). Never hard-code hostnames.
- **Authentication**:
  - Registered customers authenticate via bearer token: `Authorization: Bearer <token>`.
  - Guest shoppers receive a token via `POST /session` and send `x-session-token: <token>` or `Authorization: Bearer <token>`.
  - When a guest logs in or registers, their guest cart lines automatically merge into their customer cart and the guest session token is retired.
- **CORS**: The backend checks `CORS_ORIGINS`. Add your dev and preview URLs to `CORS_ORIGINS`.
- **Standard Error Format**:
  ```json
  {
    "error": {
      "code": "BAD_CREDENTIALS",
      "message": "Invalid email or password."
    }
  }
  ```
- **Rate Limits**:
  - `POST /auth/login`: 5 failed attempts per 15-minute window; 6th attempt returns `429 Too Many Requests` (lockout).
  - `POST /auth/password/forgot`: 3 requests per 15-minute window per IP.
  - `POST /chat`: 20 requests per minute per IP.
  - `POST /checkout`: 120 requests per minute per IP.
- **Security Boundaries**:
  - Never put Razorpay Key Secret or Google Maps server API keys in frontend code.
  - Public Razorpay Key ID is returned dynamically by `POST /orders/:id/payment`.

---

## 1. Authentication & Account Management

### `POST /auth/register`
- **Request Body**:
  ```json
  {
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "password": "StrongPassword123!",
    "phone": "9876543210"
  }
  ```
- **Success (`201 Created`)**:
  ```json
  {
    "customer_id": 42,
    "token": "sess_01abcdef...",
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "phone": "9876543210"
  }
  ```
- **Errors**: `400 BAD_INPUT`, `409 EMAIL_IN_USE`.

### `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "arjun@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "customer_id": 42,
    "token": "sess_01abcdef...",
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "phone": "9876543210"
  }
  ```
- **Errors**: `401 BAD_CREDENTIALS`, `429 ACCOUNT_LOCKED`.

### `POST /auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Success (`204 No Content`)**: Session invalidated.

### `GET /me`
- **Headers**: `Authorization: Bearer <token>`
- **Success (`200 OK`)**:
  ```json
  {
    "id": 42,
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "phone": "9876543210",
    "created_at": "2026-11-20T10:00:00.000Z"
  }
  ```
- **Errors**: `401 SESSION_REQUIRED`.

### `POST /auth/password/forgot`
- **Request Body**:
  ```json
  {
    "email": "arjun@example.com"
  }
  ```
- **Success (`202 Accepted`)**: Constant-time response regardless of email existence.

### `POST /auth/password/reset`
- **Request Body**:
  ```json
  {
    "token": "reset_raw_token_from_email_link",
    "password": "NewStrongPassword456!"
  }
  ```
- **Success (`204 No Content`)**: Password updated and all prior sessions invalidated.
- **Errors**: `400 TOKEN_INVALID_OR_EXPIRED`.

---

## 2. Payments (Mock & Razorpay)

### `POST /orders/:id/payment`
Initializes payment. Total paise is derived exclusively from the order record in the database.
- **Headers**: `Authorization: Bearer <token>`
- **Success (`200 OK`)**:
  ```json
  {
    "provider": "razorpay",
    "key_id": "rzp_test_abcdef123456",
    "payment_id": 101,
    "razorpay_order_id": "order_mock_9a8b7c",
    "amount_paise": 74900,
    "currency": "INR",
    "notes": { "order_id": "964c2a9d-12d2-4b07-98b0-09498cef7944" }
  }
  ```

### `POST /orders/:id/payment/verify`
Browser verification after Razorpay checkout completion modal returns signatures.
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_mock_9a8b7c",
    "razorpay_payment_id": "pay_mock_123456",
    "razorpay_signature": "sha256_hex_hmac_signature"
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "order": {
      "id": "964c2a9d-12d2-4b07-98b0-09498cef7944",
      "status": "PLACED",
      "payment_status": "PAID",
      "total_paise": 74900
    },
    "replay": false
  }
  ```
- **Errors**: `400 TAMPERED_SIGNATURE`, `400 PAYMENT_EXPIRED`.

### `GET /orders/:id/payment`
Status query for polling after modal close.
- **Success (`200 OK`)**:
  ```json
  {
    "order_id": "964c2a9d-12d2-4b07-98b0-09498cef7944",
    "status": "PAID",
    "amount_paise": 74900,
    "provider": "razorpay",
    "transaction_id": "pay_mock_123456",
    "updated_at": "2026-11-21T16:00:00.000Z"
  }
  ```

---

## 3. Maps & Geolocation

### `GET /branches/nearest?lat=12.9716&lng=77.5946&limit=3`
Finds nearest active branches sorted by Haversine distance.
- **Success (`200 OK`)**:
  ```json
  [
    {
      "id": 2,
      "name": "StockSure Indiranagar",
      "city": "Bengaluru",
      "address": "100ft Road, Indiranagar",
      "lat": 12.9784,
      "lng": 77.6408,
      "distance_km": 5.06,
      "directions_url": "https://www.google.com/maps/dir/?api=1&destination=12.9784,77.6408",
      "active": true
    }
  ]
  ```

### `GET /branches/:id/directions?from_lat=12.9716&from_lng=77.5946`
Returns distance, realistic ETA, and Google navigation deep link.
- **Success (`200 OK`)**:
  ```json
  {
    "branch_id": 2,
    "branch_name": "StockSure Indiranagar",
    "distance_km": 5.06,
    "duration_minutes": 15,
    "directions_url": "https://www.google.com/maps/dir/?api=1&origin=12.9716,77.5946&destination=12.9784,77.6408"
  }
  ```

### `POST /geo/geocode`
Server geocoding with 24-hour LRU cache.
- **Request Body**:
  ```json
  { "address": "Indiranagar 100ft Road, Bengaluru" }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "lat": 12.9784,
    "lng": 77.6408,
    "formatted_address": "100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038"
  }
  ```

---

## 4. Delivery & Tracking

### `GET /delivery/quote?lat=12.9716&lng=77.5946&amount_paise=120000`
Calculates delivery eligibility and fee.
- **Success (`200 OK`)**:
  ```json
  {
    "serviceable": true,
    "branch_id": 2,
    "branch_name": "StockSure Indiranagar",
    "distance_km": 5.06,
    "fee_paise": 0,
    "eta_minutes": 27
  }
  ```

### `GET /orders/:id/tracking`
Live customer delivery status.
- **Headers**: `Authorization: Bearer <token>`
- **Security Rule**: `handover_code` is returned **only** when `status === 'OUT_FOR_DELIVERY'`.
- **Success (`200 OK`)**:
  ```json
  {
    "order_id": "964c2a9d-12d2-4b07-98b0-09498cef7944",
    "status": "OUT_FOR_DELIVERY",
    "eta_minutes": 18,
    "branch": {
      "id": 2,
      "name": "StockSure Indiranagar",
      "city": "Bengaluru"
    },
    "destination": {
      "name": "Jane Doe",
      "line1": "123 Green Valley",
      "city": "Bengaluru",
      "pincode": "560001",
      "lat": 12.9716,
      "lng": 77.5946,
      "phone_masked": "987****210"
    },
    "rider": {
      "name": "Ramesh Rider",
      "phone": "9876500000",
      "lat": 12.9750,
      "lng": 77.5980,
      "stale": false
    },
    "handover_code": "4821",
    "history": [
      { "status": "CONFIRMED", "at": "2026-11-21T16:05:00.000Z" },
      { "status": "PACKED", "at": "2026-11-21T16:15:00.000Z" },
      { "status": "OUT_FOR_DELIVERY", "at": "2026-11-21T16:25:00.000Z" }
    ]
  }
  ```

### `POST /orders/:id/issue`
Customer issue report within 48-hour delivery window.
- **Request Body**:
  ```json
  {
    "reason": "DAMAGED",
    "note": "Package arrived with damaged container."
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "issue_id": 5,
    "status": "RECEIVED"
  }
  ```

---

## 5. Rules-based Chatbot

### `POST /chat`
- **Request Body**:
  ```json
  {
    "message": "how fast is your delivery?",
    "context": { "city": "Bengaluru" }
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "intent": "HELP_FAQ",
    "reply": "We dispatch from our local flagship provisions hubs within 45 minutes across Bengaluru, Mumbai, Delhi, Ahmedabad, Kolkata, and Pune.",
    "suggestions": ["Browse shop", "Contact human agent", "Delivery timings"]
  }
  ```
- **Action Payloads**:
  - `show_products`: `{ "query": "monstera" }`
  - `navigate`: `{ "route": "shop" }` (allowed: `home, shop, cart, checkout, orders, account, login, map, help`)
  - `open_map`: `{ "city": "Bengaluru" }`
  - `show_order`: `{ "order_id": "964c2a9d-..." }`
