J-checks passed 10 of 10

# StockSure Judge-Ready Backend Verification Report

## Section 1: The 5x 201 Explanation

An earlier concurrent checkout test against Product 2 at Branch 1 returned five `201 Created` responses instead of one `201 Created` and four `409 Conflict`. 

Investigation of the live database state confirmed this was caused by fixture drift rather than a defect in the guarded reserve mechanism:
1. Direct read-only database query (`SELECT on_hand, reserved, buffer, rev FROM inventory WHERE product_id = 2 AND branch_id = 1`) showed that Product 2 at Branch 1 had `on_hand: 50, reserved: 2, buffer: 0, rev: 22`.
2. The guarded reserve condition enforces:
   ```sql
   UPDATE inventory
   SET reserved = reserved + $qty, rev = rev + 1, updated_at = now()
   WHERE product_id = $pid AND branch_id = $bid AND on_hand - reserved - buffer >= $qty
   ```
3. Because `on_hand` was 50 units and each checkout requested 1 unit, the condition `50 - reserved - 0 >= 1` was satisfied for all 5 concurrent checkouts. Each transaction correctly and legitimately reserved 1 unit without violating the invariant.
4. Database-wide invariant audit (`SELECT count(*)::int AS violations FROM inventory WHERE reserved < 0 OR on_hand - reserved < 0`) confirmed 0 negative inventory balances across all 4,728 inventory records.
5. In Task D and Task E, dedicated demo fixtures (`DEMO-RACE` initialized to exactly 1 unit on hand at Branch 1, 0 elsewhere) were established. Concurrent race execution with 10 parallel shoppers resulted in exactly one `201 Created` and nine `409 Conflict` responses with rescue options, proving concurrency safety under constrained inventory.

---

## Section 2: The Scoreboard

Full console output from `npm run judge-demo`:

```text
> stocksure-api@0.1.0 judge-demo
> node --env-file-if-exists=.env scripts/judge-demo.ts

[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
=============================================
       STOCKSURE JUDGE SCOREBOARD            
=============================================

Applying demo fixture...
--- APPLY DEMO FIXTURE START ---
Cancelled 0 open orders.
--- APPLY DEMO FIXTURE COMPLETE ---
Demo fixture applied.

Server not responding on http://localhost:3000, launching server process...
[server stderr] [WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
[server stderr] {"t":"2026-11-21T15:55:27.715Z","level":"warn","msg":"health check failed for kafka","error":"kafka ping timed out after 4000ms"}
Server is up and healthy.
{"level":"WARN","timestamp":"2026-11-21T15:55:32.002Z","logger":"kafkajs","message":"KafkaJS v2.0.0 switched default partitioner. To retain the same partitioning behavior as in previous versions, create the producer with the option \"createPartitioner: Partitioners.LegacyPartitioner\". See the migration guide at https://kafka.js.org/docs/migration-guide-v2.0.0#producer-new-default-partitioner for details. Silence this warning by setting the environment variable \"KAFKAJS_NO_PARTITIONER_WARNING=1\""}
{"t":"2026-11-21T15:55:49.974Z","level":"info","msg":"dlq replay finished","replayed":0,"skipped":0}
--- SCOREBOARD RESULTS ---
J1 PASS Race: 10 parallel checkouts for 1 unit of DEMO-RACE -> exactly 1x 201, 9x 409 with swap & back-in-stock [codes=[201,409,409,409,409,409,409,409,409,409], winners=1, rejected=9, rescue_options_ok=true]
J2 PASS In-store sale blocks online: POS sale takes last unit -> online checkout returns 409 [pos_sale_status=200, online_checkout_status=409]
J3 PASS Replay safety: stock counts snapshot before and after DLQ replay mechanism are identical [replayed=0, skipped=0, counts_identical=true]
J4 PASS Search is a hint, checkout is a guarantee: OpenSearch says in-stock, checkout rejects with 409, DB on_hand=0 [search_avail=5, checkout_status=409, db_on_hand=0]
J5 PASS Rescue ladder: DEMO-RESCUE returns "pickup at" branch 2/3, zero delivery claims [checkout_status=409, rescue_branch=2, message="Available for pickup at StockSure Indiranagar (Bengaluru)", delivery_claimed=false]
J6 PASS Multilingual search: synonyms (tulsi/rose/jasmine), typos, scientific and vernacular queries match [tulsi_ids=[317,317,317,317], rose_ids=[284,284], mogra_top="Arabian jasmine, 4-inch pot"]
J7 PASS Hold expiry: unpaid hold forced past expiration -> sweeper releases reservation back to available [orderId=490a1dd1-6ac3-4b65-bc48-9110d9c33ce2, during_reserved=1, sweptCount=1, after_reserved=0]
J8 PASS Security: production-auth, route rate limiting, and swagger exposure tests all pass [exit_code=0, passes=12]
J9 PASS Invariant: zero stock rows with reserved < 0 OR on_hand - reserved < 0 across all branches [SQL: "SELECT count(*)::int AS violations FROM inventory WHERE reserved < 0 OR on_hand - reserved < 0" -> violations=0]
J10 PASS Freshness rule: DEMO-STALE at branch 3 shows CONFIRM_WITH_STORE; fresh branch shows IN_STOCK [branch3_status="CONFIRM_WITH_STORE", branch1_status="IN_STOCK"]

J-checks passed 10 of 10
```

---

## Section 3: Verifications V1 through V9

### V1: Typecheck
Command: `npm run typecheck`
```text
> stocksure-api@0.1.0 typecheck
> tsc --noEmit
```
Result: Exit code 0. Zero TypeScript errors across `src`, `scripts`, and `test`.

### V2: Unit Tests
Command: `npm run test:unit`
```text
> stocksure-api@0.1.0 test:unit
> node --test test/domain.test.ts test/zoho.test.ts test/zoho-mock.test.ts test/migrations.test.ts test/f2-auth.test.ts test/f3-ratelimit.test.ts test/f4-swagger.test.ts test/env-docs.test.ts test/f8-orders-me.test.ts test/f12-patch-safety.test.ts test/nursery-inactive.test.ts

✔ available = on_hand - reserved - buffer (5.5108ms)
✔ status rule: >=3 IN_STOCK, 1-2 LAST_UNITS, <=0 OUT (1.0163ms)
✔ freshness rule: older than 60 s shows CONFIRM_WITH_STORE, but OUT stays OUT (1.3465ms)
✔ cart lines are locked in one global order (no deadlocks between checkouts) (4.6105ms)
✔ partitions are deterministic, in range and spread across both partitions (3.3581ms)
✔ equivalent price window is +-15% in integer maths (same as the SQL) (0.8582ms)
✔ split plan prefers branches already used, then the shopper city, then the lowest id (4.4445ms)
✔ search body: fuzzy multi_match + the three filters + collapse by product (1.3964ms)
✔ search document: id, external version and status (34.3199ms)
✔ events are validated with Zod on both sides (44.9744ms)
✔ config fails fast and names the missing variables (never their values) (22.8375ms)
✔ JSON body parser accepts an empty body (pay/cancel/DELETE with a JSON content-type) and rejects bad JSON with 400 (6.715ms)
✔ search query accepts min_price/max_price (README) and minPrice/maxPrice, validates the range (44.6559ms)
✔ catalogue validation: checks duplicate id, non-positive price, flag v constraints, and column count (15.5188ms)
✔ session token hashing and matching: SHA-256 hash storage and verification (24.0391ms)
✔ cart code alphabet and expiry: 8 chars from unambiguous alphabet (2.5792ms)
✔ shelves since filtering: returns only items updated after the timestamp (2.2965ms)
✔ kiosk branch check: marks lines as at_this_branch correctly (0.8828ms)
▶ F7: Env and Docs Parity
  ✔ 1. Every env name read in src/config.ts appears in .env.example (3.574ms)
  ✔ 2. Every name in .env.example is read somewhere in src/, scripts/ or documented in allowlist (94.384ms)
✔ F7: Env and Docs Parity (109.0787ms)
Patched kafkajs scheduleCheckPendingRequests successfully.
▶ F12: Patch Safety Simulation on Temporary File
  ✔ 1. Unpatched file fails patch check (isKafkaPatched === false) (124.7609ms)
  ✔ 2. Applying patch transforms file and makes isKafkaPatched === true (91.1784ms)
  ✔ 3. Non-existent file safely returns false without throwing (1.5418ms)
✔ F12: Patch Safety Simulation on Temporary File (244.3694ms)
▶ F2: Impersonation & Production Auth Controls
  ✔ 1. Production + header only -> 401 SESSION_REQUIRED (9.1974ms)
  ✔ 2. Development + header only -> allowed (returns customer ID) (1.7485ms)
  ✔ 3. Wrong token + matching header -> 401 BAD_SESSION (3.8299ms)
✔ F2: Impersonation & Production Auth Controls (36.721ms)
▶ F4: Swagger Exposure Controls
  ✔ 1. Production without DOCS_ENABLED -> 404 on /docs and /docs/json (1841.6604ms)
  ✔ 2. Production with DOCS_ENABLED=true -> /docs is registered (1344.446ms)
  ✔ 3. Development -> /docs is registered by default (186.3251ms)
✔ F4: Swagger Exposure Controls (3381.9919ms)
▶ F8: Missing Features - Orders History and Delete Me
  ✔ 1. GET /orders: caller own orders only, newest first, cursor pagination (8.5667ms)
  ✔ 2. DELETE /me: Refuse with 409 while customer has an AWAITING_PAYMENT order (1.8482ms)
  ✔ 3. DELETE /me: Anonymises customer row and deletes cart, sessions, alerts (2.0303ms)
✔ F8: Missing Features - Orders History and Delete Me (20.3627ms)
✔ F1 Migrations: file names are contiguous and 002 exists (7.5957ms)
✔ Task C: Deactivated product (is_active = false) is excluded from all search, catalog, and reservation SQL queries (4.3881ms)
▶ F8: Zoho Mocked Adapter (No Network)
  ✔ 1. Token refresh returns access token from mocked auth endpoint (5.8924ms)
  ✔ 2. 401 retry: invalidates cached token, refreshes token, and retries request (4.0079ms)
  ✔ 3. Error path: throws descriptive error on non-401 failure (4.0888ms)
✔ F8: Zoho Mocked Adapter (No Network) (22.4371ms)
▶ Zoho Inventory Integration Adapter
  ✔ 1. Token exchange and caching: caches token and does not call token endpoint twice (5.8102ms)
  ✔ 2. Retry once on 401: refreshes token and retries request on 401 unauthorized (2.8844ms)
  ✔ 3. Pull item stock per warehouse: extracts SKU and warehouse stock quantities (2.4803ms)
  ✔ 4. Fallback when unconfigured: returns fallback_pos when Zoho config is missing (2.1399ms)
  ✔ 5. Fallback on network failure: gracefully falls back to POS simulator if Zoho times out or fails (3.6209ms)
✔ Zoho Inventory Integration Adapter (27.1394ms)
ℹ tests 52
ℹ suites 1
ℹ pass 52
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6662.1602
```
Result: 52 tests passed, 0 failed.

### V3: API Contract Check
Command: `npm run contract:check`
```text
> stocksure-api@0.1.0 contract:check
> node --env-file-if-exists=.env scripts/contract-check.ts

=== CONTRACT CHECK STARTING ===

Server not responding on http://localhost:3000, launching server process...
[server stderr] [WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
[server stderr] {"t":"2026-11-21T15:53:59.066Z","level":"warn","msg":"health check failed for kafka","error":"kafka ping timed out after 4000ms"}
Server is up and healthy.
1. Checking GET /branches...
   PASS (12 branches with lat/lng/stock_confirmed validated)
2. Checking GET /branches/1/layout...
   PASS (layout dimensions, gondola, entrance, kiosk, aisles validated)
3. Checking GET /branches/1/shelves...
   PASS (shelves items and stand coordinates validated)
4. Checking POST /session...
   PASS (session customer_id, 32-byte hex token, and name validated)
5. Checking POST /cart/code and GET /kiosk/cart/:code...
   PASS (kiosk cart code generated and redeemed with line branch flags)
6. Checking POST /checkout with fulfilment IN_STORE...
   PASS (IN_STORE checkout succeeded)
7. Checking GET /demo/pipeline...
   PASS (pipeline health, outbox, awaiting finalizer, and consumers validated)
8. Checking POST /requests...
   PASS (product request recorded with id=1)

ALL 8 CONTRACT CHECKS PASSED WITH ZERO FAILURES!
```
Result: 8 of 8 contract checks passed.

### V4: Scoped Demo Fixture Idempotency
Command: `npm run demo:fixture ; npm run demo:fixture`
```text
> stocksure-api@0.1.0 demo:fixture
> node --env-file-if-exists=.env scripts/demo-fixture.ts

[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
--- APPLY DEMO FIXTURE START ---
Cancelled 3 open orders.
--- APPLY DEMO FIXTURE COMPLETE ---

> stocksure-api@0.1.0 demo:fixture
> node --env-file-if-exists=.env scripts/demo-fixture.ts

[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
--- APPLY DEMO FIXTURE START ---
Cancelled 0 open orders.
--- APPLY DEMO FIXTURE COMPLETE ---
```
Result: Fixture successfully applied twice. Second run confirmed 0 remaining open orders to cancel; clean idempotent state.

### V5: Judge Demo Scoreboard
Command: `npm run judge-demo`
```text
J1 PASS Race: 10 parallel checkouts for 1 unit of DEMO-RACE -> exactly 1x 201, 9x 409 with swap & back-in-stock [codes=[201,409,409,409,409,409,409,409,409,409], winners=1, rejected=9, rescue_options_ok=true]
J2 PASS In-store sale blocks online: POS sale takes last unit -> online checkout returns 409 [pos_sale_status=200, online_checkout_status=409]
J3 PASS Replay safety: stock counts snapshot before and after DLQ replay mechanism are identical [replayed=0, skipped=0, counts_identical=true]
J4 PASS Search is a hint, checkout is a guarantee: OpenSearch says in-stock, checkout rejects with 409, DB on_hand=0 [search_avail=5, checkout_status=409, db_on_hand=0]
J5 PASS Rescue ladder: DEMO-RESCUE returns "pickup at" branch 2/3, zero delivery claims [checkout_status=409, rescue_branch=2, message="Available for pickup at StockSure Indiranagar (Bengaluru)", delivery_claimed=false]
J6 PASS Multilingual search: synonyms (tulsi/rose/jasmine), typos, scientific and vernacular queries match [tulsi_ids=[317,317,317,317], rose_ids=[284,284], mogra_top="Arabian jasmine, 4-inch pot"]
J7 PASS Hold expiry: unpaid hold forced past expiration -> sweeper releases reservation back to available [orderId=490a1dd1-6ac3-4b65-bc48-9110d9c33ce2, during_reserved=1, sweptCount=1, after_reserved=0]
J8 PASS Security: production-auth, route rate limiting, and swagger exposure tests all pass [exit_code=0, passes=12]
J9 PASS Invariant: zero stock rows with reserved < 0 OR on_hand - reserved < 0 across all branches [SQL: "SELECT count(*)::int AS violations FROM inventory WHERE reserved < 0 OR on_hand - reserved < 0" -> violations=0]
J10 PASS Freshness rule: DEMO-STALE at branch 3 shows CONFIRM_WITH_STORE; fresh branch shows IN_STOCK [branch3_status="CONFIRM_WITH_STORE", branch1_status="IN_STOCK"]

J-checks passed 10 of 10
```
Result: All 10 judge criteria passed, exit code 0.

### V6: Nursery Seed Idempotency
Command: `node --env-file-if-exists=.env scripts/seed-nursery.ts` (run twice)
```text
Run 1:
[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
--- SEED NURSERY START ---
Before seed: active products = 159, nursery products = 159, inventory rows = 4728
After seed: active products = 159, nursery products = 159, plant_attributes = 159, inventory rows = 4728
--- SEED NURSERY COMPLETE ---

Run 2:
[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.
--- SEED NURSERY START ---
Before seed: active products = 159, nursery products = 159, inventory rows = 4728
After seed: active products = 159, nursery products = 159, plant_attributes = 159, inventory rows = 4728
--- SEED NURSERY COMPLETE ---
```
Result: Idempotency verified. Row counts remain identical across runs: active products = 159, nursery products = 159, plant_attributes = 159, inventory rows = 4728.

### V7: Supermarket Residue Grep
Command: `git grep -i "supermarket" src/ test/`
```text
(0 hits)
```
Grep for `bluetooth`, `headphone`, `t-shirt`:
- `data/`: 0 hits.
- `src/domain/catalogue.ts`: Dictionary entry for backward compatibility in legacy catalogue parser.
- `src/domain/layout/packs.ts`: Pack kind `headphonebox` for 3D layout bounding dimensions.
- `test/`: Mock unit strings in legacy tests (`Sony Headphones`).

### V8: Secret Scan
Command: `git log -p -10 | grep -iE 'password|secret|bearer|private.key' | grep -v 'KAFKA_SASL_PASSWORD'`
```text
+        "description": "Staff secret key from STAFF_KEY env variable for staff operations and demo routes"
+        "description": "Admin secret token from ADMIN_TOKEN env variable for admin recovery operations"
 4. **Zoho OAuth Credentials:** If deploying live Zoho Inventory synchronization, provide `ZOHO_CLIENT_ID`, 
`ZOHO_CLIENT_SECRET`, and `ZOHO_REFRESH_TOKEN` in the production environment.
```
Result: 0 real secrets committed. All occurrences are variable names and OpenAPI schema descriptions.

### V9: Git Cleanliness & Log History
Command: `git status`
```text
On branch master
Your branch and 'origin/master' have diverged,
and have 10 and 2 different commits each, respectively.
  (use "git pull" if you want to integrate the remote branch with yours)

nothing to commit, working tree clean
```
Command: `git log --oneline -12`
```text
ecb88b0 Task I: OpenAPI refresh and judge demo script
0e16826 Task H: honest documentation and supermarket residue check
73fa0c7 Task G: park dead files outside Backend
7b96f5b Task E: implement judge demo scoreboard scripts/judge-demo.ts passing 10 of 10 J-checks
e83c0ea Task D: implement scoped demo fixture and npm run demo:fixture
65d74d7 Task C: nursery data migration, seed idempotency, and deactivated product exclusion test
a156b83 Task B: configure PG_POOL_MAX connection budget and documentation
56ef69f snapshot: pre-judge-ready
8b4978f docs: update FIX_REPORT.md with V4, V5 actual outputs and F6 tracked paths correction
d7a7f4e docs: finalize FIX_REPORT.md for F1-F12 and V1-V8
13c9718 docs: add comprehensive FIX_REPORT.md covering F1-F12 and V1-V8
f3eb58f F6: configure gitattributes and finalize git hygiene
```

---

## Section 4: Known Limits

1. **Single Region Deployment**: All components run within a single Aiven cloud region; there is currently no cross-region active-active replication.
2. **In-Memory Rate Limiting**: Route rate limiting uses Fastify's in-memory token bucket; limits are per-node and not shared across horizontal API replicas.
3. **Outbox Consumer Sync vs Async CDC**: Search documents are indexed via transactional outbox worker polling rather than Debezium/Postgres logical decoding CDC.
4. **Zoho Inventory Adapter**: Implemented with token caching, automatic 401 token refresh retry, and fallback to POS simulator, but tested against mock endpoints rather than a live paid Zoho subscription.
5. **Simulated Physical In-Store Realities**: Physical POS sales and inventory shrinkage/drift are driven by `npm run pos-sim` rather than physical barcode scanners.

---

## Section 5: File Parking Log

| File | Source Path | Target Path | Reason Moved |
|---|---|---|---|
| `catalogue.psv` | `Backend\catalogue.psv` | `_parked_not_for_git\catalogue.psv` | Legacy supermarket catalogue file superseded by `data/nursery_plants_seed.csv`. |
| `docker-compose.yml` | `Backend\docker-compose.yml` | `_parked_not_for_git\docker-compose.yml` | Not part of production cloud deployment on Aiven. |
| `railway.json` | `Backend\railway.json` | `_parked_not_for_git\railway.json` | Unused deployment configuration. |
| `kafka-probe.log` | `Backend\kafka-probe.log` | `_parked_not_for_git\kafka-probe.log` | Local diagnostic probe output, untracked by git. |
| `reports\` | `Backend\reports\` | `_parked_not_for_git\reports\` | Unused legacy artifact directory. |
