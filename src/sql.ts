// Every SQL statement in the backend. Parameterised only ($1, $2 ...), never string-built.
// Explicit casts ($1::int) keep each statement usable as a PREPAREd statement (see test/sql.test.ts).

// ---------- cart ----------
export const ENSURE_CART_SQL = `
INSERT INTO carts (customer_id) VALUES ($1::int)
ON CONFLICT (customer_id) DO UPDATE SET updated_at = now()
RETURNING id`;

export const CART_ITEMS_SQL = `
SELECT product_id, branch_id, qty FROM cart_items WHERE cart_id = $1::int ORDER BY branch_id, product_id`;

export const CART_VIEW_SQL = `
SELECT ci.product_id, p.name, p.brand, p.price_paise, p.image_url,
       p.image_status,
       CASE 
         WHEN p.image_author IS NOT NULL AND p.image_license IS NOT NULL 
           THEN 'Photo: ' || p.image_author || ', ' || p.image_license
         WHEN p.image_author IS NOT NULL 
           THEN 'Photo: ' || p.image_author
         ELSE NULL 
       END AS image_credit,
       ci.branch_id, b.name AS branch_name, b.city, ci.qty,
       GREATEST(i.on_hand - i.reserved - i.buffer, 0)::int AS available
  FROM carts ca
  JOIN cart_items ci ON ci.cart_id = ca.id
  JOIN products   p  ON p.id = ci.product_id AND p.is_active = true
  JOIN branches   b  ON b.id = ci.branch_id
  JOIN inventory  i  ON i.branch_id = ci.branch_id AND i.product_id = ci.product_id
 WHERE ca.customer_id = $1::int
 ORDER BY ci.branch_id, ci.product_id`;

export const STOCK_EXISTS_SQL = `
SELECT 1 AS ok FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.branch_id = $1::int AND i.product_id = $2::int AND p.is_active = true`;

export const UPSERT_ITEM_SQL = `
INSERT INTO cart_items (cart_id, product_id, branch_id, qty) VALUES ($1::int, $2::int, $3::int, $4::int)
ON CONFLICT (cart_id, product_id, branch_id) DO UPDATE SET qty = LEAST(cart_items.qty + EXCLUDED.qty, 10)`;

export const SET_ITEM_QTY_SQL = `
UPDATE cart_items SET qty = $4::int WHERE cart_id = $1::int AND product_id = $2::int AND branch_id = $3::int`;

export const DELETE_ITEM_SQL = `
DELETE FROM cart_items WHERE cart_id = $1::int AND product_id = $2::int AND branch_id = $3::int`;

export const CLEAR_CART_SQL = `DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE customer_id = $1::int)`;

// ---------- checkout ----------
// Prices come from the database, never from the browser.
export const CART_LINES_SQL = `
SELECT ci.branch_id, ci.product_id, ci.qty, p.price_paise AS unit_price_paise, p.name, b.name AS branch_name
  FROM carts ca
  JOIN cart_items ci ON ci.cart_id = ca.id
  JOIN products p ON p.id = ci.product_id AND p.is_active = true
  JOIN branches b ON b.id = ci.branch_id
 WHERE ca.customer_id = $1::int`;

// Insert the order FIRST. A repeated Idempotency-Key conflicts here and returns the existing order.
export const INSERT_ORDER_SQL = `
INSERT INTO orders (customer_id, status, total_paise, fulfilment, idempotency_key, expires_at, branch_id)
VALUES ($1::int, 'AWAITING_PAYMENT', $2::bigint, $3::text, $4::text, now() + make_interval(mins => $5::int), $6::int)
ON CONFLICT (customer_id, idempotency_key) DO NOTHING
RETURNING id`;

export const ORDER_BY_KEY_SQL = `SELECT id FROM orders WHERE customer_id = $1::int AND idempotency_key = $2::text`;

// A shopper has one open checkout at a time: older unpaid holds are cancelled when a new checkout succeeds.
export const PENDING_ORDERS_SQL = `
SELECT id FROM orders
 WHERE customer_id = $1::int AND status = 'AWAITING_PAYMENT' AND id <> $2::uuid
 ORDER BY created_at, id
 FOR UPDATE`;

// THE GUARDED RESERVE. One statement decides who gets the last unit. 0 rows = not enough stock.
// Under READ COMMITTED a second buyer waits for the first, then Postgres re-checks the WHERE on the updated row.
export const RESERVE_SQL = `
UPDATE inventory i
   SET reserved = i.reserved + $3::int, rev = i.rev + 1, updated_at = now()
  FROM products p
 WHERE i.branch_id = $1::int AND i.product_id = $2::int
   AND p.id = i.product_id AND p.is_active = true
   AND i.on_hand - i.reserved - i.buffer >= $3::int
RETURNING i.on_hand, i.reserved, i.buffer, i.rev`;

export const INSERT_LINES_SQL = `
INSERT INTO order_lines (order_id, product_id, branch_id, qty, unit_price_paise)
SELECT $1::uuid, v.product_id, v.branch_id, v.qty, v.price
  FROM unnest($2::int[], $3::int[], $4::int[], $5::int[]) AS v(product_id, branch_id, qty, price)`;

// ---------- stock changes (every change = lock, set, ledger row, outbox event) ----------
export const LOCK_STOCK_SQL = `
SELECT on_hand, reserved, buffer, rev FROM inventory
 WHERE branch_id = $1::int AND product_id = $2::int
 FOR UPDATE`;

export const SET_STOCK_SQL = `
UPDATE inventory
   SET on_hand = $3::int, reserved = $4::int, rev = rev + 1, updated_at = now()
 WHERE branch_id = $1::int AND product_id = $2::int
RETURNING on_hand, reserved, buffer, rev`;

export const LEDGER_SQL = `
INSERT INTO stock_ledger (branch_id, product_id, kind, delta_on_hand, delta_reserved, ref)
VALUES ($1::int, $2::int, $3::text, $4::int, $5::int, $6::text)`;

// ---------- order lifecycle ----------
export const PAY_SQL = `
UPDATE orders SET status = 'PLACED', paid_at = now(), updated_at = now()
 WHERE id = $1::uuid AND customer_id = $2::int AND status = 'AWAITING_PAYMENT' AND expires_at > now()
RETURNING id`;

export const ORDER_STATUS_SQL = `SELECT status FROM orders WHERE id = $1::uuid AND customer_id = $2::int`;
export const ORDER_STATUS_LOCK_SQL = `SELECT status FROM orders WHERE id = $1::uuid AND customer_id = $2::int FOR UPDATE`;

export const LEAVE_AWAITING_SQL = `
UPDATE orders SET status = $2::order_status, updated_at = now()
 WHERE id = $1::uuid AND status = 'AWAITING_PAYMENT'
RETURNING id, customer_id`;

export const ORDER_LINES_FOR_STOCK_SQL = `
SELECT branch_id, product_id, qty FROM order_lines WHERE order_id = $1::uuid ORDER BY branch_id, product_id`;

export const LOAD_ORDER_SQL = `
SELECT id, customer_id, status, total_paise, fulfilment, expires_at, created_at, paid_at, finalized_at
  FROM orders WHERE id = $1::uuid`;

export const LOAD_ORDER_LINES_SQL = `
SELECT ol.product_id, p.name, ol.branch_id, b.name AS branch_name, b.city, ol.qty, ol.unit_price_paise
  FROM order_lines ol
  JOIN products p ON p.id = ol.product_id
  JOIN branches b ON b.id = ol.branch_id
 WHERE ol.order_id = $1::uuid
 ORDER BY ol.branch_id, ol.product_id`;

// Expiry sweeper: unpaid orders past their hold. SKIP LOCKED lets two sweepers never fight over one order.
export const EXPIRED_NEXT_SQL = `
SELECT id FROM orders
 WHERE status = 'AWAITING_PAYMENT' AND expires_at <= now()
 ORDER BY expires_at, id
 LIMIT 1
 FOR UPDATE SKIP LOCKED`;

// Conflict check: newest unpaid hold on this item.
export const NEWEST_HOLDER_SQL = `
SELECT o.id FROM orders o
  JOIN order_lines ol ON ol.order_id = o.id
 WHERE ol.branch_id = $1::int AND ol.product_id = $2::int AND o.status = 'AWAITING_PAYMENT'
 ORDER BY o.created_at DESC, o.id DESC
 LIMIT 1
 FOR UPDATE OF o`;

export const HEARTBEAT_SQL = `UPDATE branches SET last_heartbeat_at = now() WHERE id = $1::int RETURNING id`;

// ---------- consumers ----------
export const CLAIM_EVENT_SQL = `
INSERT INTO processed_events (consumer, event_id) VALUES ($1::text, $2::uuid) ON CONFLICT DO NOTHING`;
export const EVENT_SEEN_SQL = `SELECT 1 AS seen FROM processed_events WHERE consumer = $1::text AND event_id = $2::uuid`;

export const FINALIZE_ORDER_SQL = `
UPDATE orders SET finalized_at = now(), updated_at = now()
 WHERE id = $1::uuid AND status = 'PLACED' AND finalized_at IS NULL
RETURNING id`;
export const ORDER_STATE_SQL = `SELECT status, finalized_at FROM orders WHERE id = $1::uuid`;

export const NOTIFY_SQL = `
INSERT INTO notifications (order_id, type, status) VALUES ($1::uuid, $2::text, 'SENT') ON CONFLICT (order_id, type) DO NOTHING`;

export const ALERT_WAITING_SQL = `
SELECT id, customer_id FROM stock_alerts
 WHERE product_id = $1::int AND branch_id = $2::int AND notified_at IS NULL
 FOR UPDATE`;
export const ALERT_MARK_SQL = `UPDATE stock_alerts SET notified_at = now() WHERE id = ANY($1::bigint[])`;
export const ALERT_INSERT_SQL = `
INSERT INTO stock_alerts (customer_id, product_id, branch_id) VALUES ($1::int, $2::int, $3::int)
ON CONFLICT (customer_id, product_id, branch_id) DO UPDATE SET notified_at = NULL
RETURNING id`;

// Search document source (indexer) and full rebuild (reindex).
export const DOC_SOURCE_SQL = `
SELECT p.id AS product_id, p.sku, p.name, p.brand, p.category, p.tags, p.price_paise, p.image_url,
       p.image_status,
       CASE 
         WHEN p.image_author IS NOT NULL AND p.image_license IS NOT NULL 
           THEN 'Photo: ' || p.image_author || ', ' || p.image_license
         WHEN p.image_author IS NOT NULL 
           THEN 'Photo: ' || p.image_author
         ELSE NULL 
       END AS image_credit,
       p.plant_common_name, p.name_hi, p.name_kn, p.scientific_name, p.aliases, p.variant_group, p.variant_size, p.is_active,
       b.id AS branch_id, b.name AS branch_name, b.city
  FROM products p CROSS JOIN branches b
 WHERE p.id = $1::int AND b.id = $2::int AND p.is_active = true`;

export const REINDEX_ROWS_SQL = `
SELECT p.id AS product_id, p.sku, p.name, p.brand, p.category, p.tags, p.price_paise, p.image_url,
       p.image_status,
       CASE 
         WHEN p.image_author IS NOT NULL AND p.image_license IS NOT NULL 
           THEN 'Photo: ' || p.image_author || ', ' || p.image_license
         WHEN p.image_author IS NOT NULL 
           THEN 'Photo: ' || p.image_author
         ELSE NULL 
       END AS image_credit,
       p.plant_common_name, p.name_hi, p.name_kn, p.scientific_name, p.aliases, p.variant_group, p.variant_size, p.is_active,
       b.id AS branch_id, b.name AS branch_name, b.city,
       i.on_hand, i.reserved, i.buffer, i.rev
  FROM inventory i
  JOIN products p ON p.id = i.product_id
  JOIN branches b ON b.id = i.branch_id
 WHERE p.is_active = true
 ORDER BY i.product_id, i.branch_id`;

// ---------- outbox relay ----------
export const RELAY_SELECT_SQL = `
SELECT id, topic, key, payload FROM outbox
 WHERE published_at IS NULL
 ORDER BY id
 LIMIT 50
 FOR UPDATE SKIP LOCKED`;

export const RELAY_MARK_SQL = `
UPDATE outbox o
   SET published_at = now(), kafka_partition = v.p, kafka_offset = v.o, attempts = o.attempts + 1
  FROM unnest($1::bigint[], $2::int[], $3::bigint[]) AS v(id, p, o)
 WHERE o.id = v.id`;

export const RELAY_FAILED_SQL = `UPDATE outbox SET attempts = attempts + 1 WHERE id = ANY($1::bigint[])`;

// ---------- catalog ----------
export const PRODUCTS_LIST_SQL = `
SELECT p.id, p.sku, p.name, p.brand, p.category, p.tags, p.price_paise, p.image_url,
       p.image_status,
       CASE 
         WHEN p.image_author IS NOT NULL AND p.image_license IS NOT NULL 
           THEN 'Photo: ' || p.image_author || ', ' || p.image_license
         WHEN p.image_author IS NOT NULL 
           THEN 'Photo: ' || p.image_author
         ELSE NULL 
       END AS image_credit,
       COALESCE(SUM(GREATEST(x.available, 0)), 0)::int AS available_total
  FROM products p
  LEFT JOIN (
        SELECT i.product_id, i.on_hand - i.reserved - i.buffer AS available
          FROM inventory i JOIN branches b ON b.id = i.branch_id
         WHERE ($2::text IS NULL OR b.city = $2::text)
       ) x ON x.product_id = p.id
 WHERE p.is_active = true AND ($1::text IS NULL OR p.category = $1::text)
 GROUP BY p.id
 ORDER BY p.id
 LIMIT $3::int OFFSET $4::int`;

export const PRODUCTS_COUNT_SQL = `SELECT count(*)::int AS n FROM products WHERE is_active = true AND ($1::text IS NULL OR category = $1::text)`;
export const PRODUCT_SQL = `
SELECT id, sku, name, brand, category, tags, price_paise, image_url,
       image_status,
       CASE 
         WHEN image_author IS NOT NULL AND image_license IS NOT NULL 
           THEN 'Photo: ' || image_author || ', ' || image_license
         WHEN image_author IS NOT NULL 
           THEN 'Photo: ' || image_author
         ELSE NULL 
       END AS image_credit
  FROM products WHERE id = $1::int AND is_active = true`;
export const CATEGORIES_SQL = `SELECT category, count(*)::int AS products FROM products WHERE is_active = true GROUP BY category ORDER BY category`;
export const BRANCHES_SQL = `SELECT id, name, city, lat, lng, last_heartbeat_at FROM branches ORDER BY id`;

export const PRODUCT_BRANCHES_SQL = `
SELECT b.id AS branch_id, b.name AS branch_name, b.city,
       (i.on_hand - i.reserved - i.buffer)::int AS available
  FROM inventory i JOIN branches b ON b.id = i.branch_id
  JOIN products p ON p.id = i.product_id AND p.is_active = true
 WHERE i.product_id = $1::int
 ORDER BY b.id`;

// ---------- search fallback (Postgres, pg_trgm) ----------
export const FALLBACK_HITS_SQL = `
SELECT p.id,
       GREATEST(similarity(p.name, $1::text), word_similarity($1::text, p.name),
                word_similarity($1::text, p.brand), word_similarity($1::text, array_to_string(p.tags, ' '))) AS score
  FROM products p
 WHERE p.is_active = true
   AND ($2::text IS NULL OR p.category = $2::text)
   AND ($3::int IS NULL OR p.price_paise >= $3::int)
   AND ($4::int IS NULL OR p.price_paise <= $4::int)
   AND ($1::text = ''
        OR p.name ILIKE '%' || $1::text || '%'
        OR $1::text <% p.name
        OR $1::text <% p.brand
        OR $1::text <% array_to_string(p.tags, ' '))
 ORDER BY score DESC, p.id
 LIMIT $5::int`;

export const FALLBACK_BRANCHES_SQL = `
SELECT p.id AS product_id, p.name, p.brand, p.category, p.price_paise, p.image_url,
       p.image_status,
       CASE 
         WHEN p.image_author IS NOT NULL AND p.image_license IS NOT NULL 
           THEN 'Photo: ' || p.image_author || ', ' || p.image_license
         WHEN p.image_author IS NOT NULL 
           THEN 'Photo: ' || p.image_author
         ELSE NULL 
       END AS image_credit,
       i.branch_id, b.name AS branch_name, b.city,
       (i.on_hand - i.reserved - i.buffer)::int AS available
  FROM products p
  JOIN inventory i ON i.product_id = p.id
  JOIN branches b ON b.id = i.branch_id
 WHERE p.is_active = true AND p.id = ANY($1::int[]) AND ($2::text IS NULL OR b.city = $2::text)`;

// ---------- Rescue Ladder ----------
// 1. Swap an equivalent: same category, price within +-15%, in stock at the same branch, closest price first.
export const EQUIVALENTS_SQL = `
SELECT p.id AS product_id, p.name, p.price_paise, i.branch_id,
       GREATEST(i.on_hand - i.reserved - i.buffer, 0)::int AS available
  FROM products p
  JOIN inventory i ON i.product_id = p.id
 WHERE p.is_active = true
   AND p.category = (SELECT category FROM products WHERE id = $1::int AND is_active = true)
   AND p.id <> $1::int
   AND i.branch_id = $2::int
   AND p.price_paise BETWEEN ($3::bigint * 85 / 100) AND ($3::bigint * 115 / 100)
   AND i.on_hand - i.reserved - i.buffer >= $4::int
 ORDER BY abs(p.price_paise - $3::bigint), p.id
 LIMIT 3`;

// 2. One branch for the whole cart. $1 product ids, $2 quantities, $3 shopper city.
export const ONE_BRANCH_SQL = `
SELECT i.branch_id, b.name AS branch_name, b.city
  FROM inventory i
  JOIN branches b ON b.id = i.branch_id
  JOIN products p ON p.id = i.product_id AND p.is_active = true
  JOIN unnest($1::int[], $2::int[]) AS want(product_id, qty) ON want.product_id = i.product_id
 WHERE i.on_hand - i.reserved - i.buffer >= want.qty
 GROUP BY i.branch_id, b.name, b.city
HAVING count(*) = cardinality($1::int[])
 ORDER BY (b.city = $3::text) DESC, i.branch_id
 LIMIT 3`;

// 3. Split across branches: stock of the failed products everywhere.
export const BRANCH_STOCK_SQL = `
SELECT i.branch_id, b.city, i.product_id, (i.on_hand - i.reserved - i.buffer)::int AS available
  FROM inventory i JOIN branches b ON b.id = i.branch_id
  JOIN products p ON p.id = i.product_id AND p.is_active = true
 WHERE i.product_id = ANY($1::int[]) AND i.on_hand - i.reserved - i.buffer > 0`;

export const FAILED_DETAIL_SQL = `
SELECT v.product_id, v.branch_id, p.name, GREATEST(i.on_hand - i.reserved - i.buffer, 0)::int AS available
  FROM unnest($1::int[], $2::int[]) AS v(product_id, branch_id)
  JOIN products p ON p.id = v.product_id
  JOIN inventory i ON i.product_id = v.product_id AND i.branch_id = v.branch_id`;

export const BRANCH_CITY_SQL = `SELECT city FROM branches WHERE id = $1::int`;

// ---------- demo / proof ----------
export const PROOF_OUTBOX_SQL = `
SELECT id, published_at, kafka_partition, kafka_offset, attempts, payload->>'event_id' AS event_id
  FROM outbox
 WHERE topic = 'orders' AND payload->>'type' = 'order.placed' AND payload->'data'->>'order_id' = $1::text
 ORDER BY id DESC LIMIT 1`;

export const PROOF_CONSUMER_SQL = `
SELECT consumer, processed_at FROM processed_events WHERE event_id = $1::uuid ORDER BY processed_at`;

export const PROOF_LEDGER_SQL = `
SELECT branch_id, product_id, kind, delta_on_hand, delta_reserved, created_at
  FROM stock_ledger WHERE ref = $1::text AND kind = 'ONLINE_SALE' ORDER BY id`;

export const PROOF_STOCK_SQL = `
SELECT ol.branch_id, ol.product_id, i.on_hand, i.reserved, i.buffer, i.rev
  FROM order_lines ol JOIN inventory i ON i.branch_id = ol.branch_id AND i.product_id = ol.product_id
 WHERE ol.order_id = $1::uuid ORDER BY ol.branch_id, ol.product_id`;

export const RECENT_OUTBOX_SQL = `
SELECT id, topic, key, payload->>'type' AS type, published_at, kafka_partition, kafka_offset, attempts, created_at
  FROM outbox ORDER BY id DESC LIMIT 20`;

export const RECENT_PROCESSED_SQL = `
SELECT consumer, event_id, processed_at FROM processed_events ORDER BY processed_at DESC LIMIT 20`;
