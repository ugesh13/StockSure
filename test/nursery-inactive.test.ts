import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTS_LIST_SQL,
  PRODUCTS_COUNT_SQL,
  PRODUCT_SQL,
  REINDEX_ROWS_SQL,
  DOC_SOURCE_SQL,
  FALLBACK_HITS_SQL,
  FALLBACK_BRANCHES_SQL,
  CART_LINES_SQL,
  STOCK_EXISTS_SQL,
  RESERVE_SQL,
  EQUIVALENTS_SQL,
  ONE_BRANCH_SQL,
  BRANCH_STOCK_SQL,
} from '../src/sql.ts';

test('Task C: Deactivated product (is_active = false) is excluded from all search, catalog, and reservation SQL queries', () => {
  // 1. Catalog queries must enforce is_active = true
  assert.ok(PRODUCTS_LIST_SQL.includes('is_active = true'), 'PRODUCTS_LIST_SQL must check is_active = true');
  assert.ok(PRODUCTS_COUNT_SQL.includes('is_active = true'), 'PRODUCTS_COUNT_SQL must check is_active = true');
  assert.ok(PRODUCT_SQL.includes('is_active = true'), 'PRODUCT_SQL must check is_active = true');

  // 2. Search queries must enforce is_active = true
  assert.ok(REINDEX_ROWS_SQL.includes('is_active = true'), 'REINDEX_ROWS_SQL must check is_active = true');
  assert.ok(DOC_SOURCE_SQL.includes('is_active = true'), 'DOC_SOURCE_SQL must check is_active = true');
  assert.ok(FALLBACK_HITS_SQL.includes('is_active = true'), 'FALLBACK_HITS_SQL must check is_active = true');
  assert.ok(FALLBACK_BRANCHES_SQL.includes('is_active = true'), 'FALLBACK_BRANCHES_SQL must check is_active = true');

  // 3. Cart & Reserve queries must enforce is_active = true
  assert.ok(CART_LINES_SQL.includes('is_active = true'), 'CART_LINES_SQL must check is_active = true');
  assert.ok(STOCK_EXISTS_SQL.includes('is_active = true'), 'STOCK_EXISTS_SQL must check is_active = true');
  assert.ok(RESERVE_SQL.includes('is_active = true'), 'RESERVE_SQL must check is_active = true');

  // 4. Rescue Ladder queries must enforce is_active = true
  assert.ok(EQUIVALENTS_SQL.includes('is_active = true'), 'EQUIVALENTS_SQL must check is_active = true');
  assert.ok(ONE_BRANCH_SQL.includes('is_active = true'), 'ONE_BRANCH_SQL must check is_active = true');
  assert.ok(BRANCH_STOCK_SQL.includes('is_active = true'), 'BRANCH_STOCK_SQL must check is_active = true');
});
