# StockSure Judge Demo Script

This script walks through the live demonstration of StockSure's guaranteed-inventory system running against Aiven PostgreSQL, Kafka, and OpenSearch.

Prerequisites:
Ensure the API server is running on `http://localhost:3000` (or set `API_URL`).
Ensure demo fixtures are initialized:
```bash
npm run demo:fixture
```

---

### Step 1: Multilingual Search — "tulasi"

Search using vernacular Hindi / phonetic spelling:

```bash
curl -s "http://localhost:3000/search?q=tulasi" | jq '.results[0] | {id: .product_id, name: .name, best_status: .best_status}'
```
**Expected Outcome**: Returns `Tulsi (holy basil)` (Product ID 317/318) matching via custom bilingual synonym analysis in OpenSearch.

---

### Step 2: Scientific & English Search — "holy basil"

Search using the English common / scientific botanical alias:

```bash
curl -s "http://localhost:3000/search?q=holy+basil" | jq '.results[0] | {id: .product_id, name: .name, best_status: .best_status}'
```
**Expected Outcome**: Returns the exact same Tulsi product record, demonstrating zero-miss catalogue discovery across language barriers.

---

### Step 3: Out-of-Stock Rescue Ladder — Reserve `DEMO-RESCUE` at Branch 1

Shopper attempts to reserve `DEMO-RESCUE` (Tulsi 6-inch pot) at Branch 1 (where stock is 0, but Branch 2 and 3 have units on hand).

1. Create guest shopper session:
```bash
SESSION=$(curl -s -X POST "http://localhost:3000/session" -H "Content-Type: application/json" -d '{"name":"Rescue Demo Shopper"}')
CUST_ID=$(echo $SESSION | jq -r '.customer_id')
TOKEN=$(echo $SESSION | jq -r '.token')
```

2. Add 1 unit of DEMO-RESCUE (Product 318) to cart for Branch 1:
```bash
curl -s -X POST "http://localhost:3000/cart/items" \
  -H "Content-Type: application/json" \
  -H "X-Customer-Id: $CUST_ID" \
  -H "X-Session-Token: $TOKEN" \
  -d '{"product_id": 318, "branch_id": 1, "qty": 1}'
```

3. Attempt checkout at Branch 1:
```bash
curl -s -i -X POST "http://localhost:3000/checkout" \
  -H "Content-Type: application/json" \
  -H "X-Customer-Id: $CUST_ID" \
  -H "X-Session-Token: $TOKEN" \
  -H "Idempotency-Key: demo-rescue-step3" \
  -d '{"fulfilment":"PICKUP", "branch_id": 1}'
```
**Expected Outcome**: HTTP `409 Conflict`. Response body includes a structured Rescue Ladder offer:
- `ONE_BRANCH`: Pickup at Branch 2 (StockSure Indiranagar) or Branch 3 (Whitefield).
- Zero claims of fictitious delivery.

---

### Step 4: The Concurrency Race — 10 Parallel Checkouts for `DEMO-RACE`

`DEMO-RACE` (Snake plant 6-inch pot) has exactly 1 unit on hand at Branch 1. Ten shoppers submit checkout requests concurrently:

```bash
# Execute concurrent checkout race using the dedicated test or node script
node --env-file-if-exists=.env -e "
import { applyDemoFixture } from './scripts/demo-fixture.ts';
async function race() {
  await applyDemoFixture();
  const raceProdId = 246; // DEMO-RACE
  const shoppers = await Promise.all(Array.from({length: 10}, async (_, i) => {
    const s = await (await fetch('http://localhost:3000/session', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Shopper ' + (i+1)})
    })).json();
    await fetch('http://localhost:3000/cart/items', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Customer-Id': String(s.customer_id), 'X-Session-Token': s.token},
      body: JSON.stringify({product_id: raceProdId, branch_id: 1, qty: 1})
    });
    return s;
  }));
  const res = await Promise.all(shoppers.map((s, idx) =>
    fetch('http://localhost:3000/checkout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Customer-Id': String(s.customer_id), 'X-Session-Token': s.token, 'Idempotency-Key': 'race-' + Date.now() + '-' + idx},
      body: JSON.stringify({fulfilment: 'PICKUP', branch_id: 1})
    })
  ));
  console.log('Statuses:', res.map(r => r.status));
}
race();
"
```
**Expected Outcome**: Exactly **one 201 Created** (the winner) and **nine 409 Conflict** (with swap and back-in-stock rescue alternatives). Database inventory remains `reserved = 1, on_hand = 1` with zero overselling.

---

### Step 5: View Pipeline Telemetry — `/demo/pipeline`

Inspect transactional outbox status, Kafka consumer health, and stream lag:

```bash
curl -s "http://localhost:3000/demo/pipeline" | jq .
```
**Expected Outcome**:
- Outbox pending messages = 0
- Consumers active and responsive
- Kafka partition offsets synchronized

---

### Step 6: In-Store POS Sale Blocks Online Checkout

When physical POS registers a sale of the last remaining shelf unit, concurrent online checkouts must immediately fail.

```bash
# 1. POS records in-store walk-in sale
curl -s -X POST "http://localhost:3000/pos/sale" \
  -H "Content-Type: application/json" \
  -H "X-Staff-Key: change-me-in-production-or-fail" \
  -d '{"branch_id": 1, "product_id": 273, "qty": 1}'

# 2. Subsequent online checkout returns 409 Conflict
```
**Expected Outcome**: POS sale returns 200 OK. The online checkout returns `409 Conflict`. Database inventory invariants are maintained without negative balances.

---

### Step 7: Final Scoreboard — All 10 J-Checks

Execute the comprehensive automated judge scoreboard:

```bash
npm run judge-demo
```
**Expected Outcome**:
```
J1 PASS Race: 10 parallel checkouts for 1 unit of DEMO-RACE -> exactly 1x 201, 9x 409 with swap & back-in-stock
J2 PASS In-store sale blocks online: POS sale takes last unit -> online checkout returns 409
J3 PASS Replay safety: stock counts snapshot before and after DLQ replay mechanism are identical
J4 PASS Search is a hint, checkout is a guarantee: OpenSearch says in-stock, checkout rejects with 409, DB on_hand=0
J5 PASS Rescue ladder: DEMO-RESCUE returns "pickup at" branch 2/3, zero delivery claims
J6 PASS Multilingual search: synonyms (tulsi/rose/jasmine), typos, scientific and vernacular queries match
J7 PASS Hold expiry: unpaid hold forced past expiration -> sweeper releases reservation back to available
J8 PASS Security: production-auth, route rate limiting, and swagger exposure tests all pass
J9 PASS Invariant: zero stock rows with reserved < 0 OR on_hand - reserved < 0 across all branches
J10 PASS Freshness rule: DEMO-STALE at branch 3 shows CONFIRM_WITH_STORE; fresh branch shows IN_STOCK

J-checks passed 10 of 10
```
