import { availableOf, stockStatus } from './availability.ts';
import type { BaseStatus } from './availability.ts';

// One OpenSearch document per product per branch. Id = "productId:branchId".

export type DocSource = {
  product_id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  price_paise: number;
  image_url: string | null;
  branch_id: number;
  branch_name: string;
  city: string;
  on_hand: number;
  reserved: number;
  buffer: number;
  rev: number;
};

export type SearchDoc = {
  product_id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  price_paise: number;
  image_url: string | null;
  city: string;
  branch_id: number;
  branch_name: string;
  available: number;
  status: BaseStatus;
  rev: number;
  updated_at: string;
};

export const docId = (productId: number, branchId: number): string => `${productId}:${branchId}`;

/** OpenSearch external versions: rev + 1, so the very first rev (0) is a valid version. Old or duplicate events are rejected. */
export const docVersion = (rev: number): number => rev + 1;

export function buildDoc(s: DocSource, lowStock: number, updatedAtIso: string): SearchDoc {
  const available = availableOf(s);
  return {
    product_id: s.product_id,
    sku: s.sku,
    name: s.name,
    brand: s.brand,
    category: s.category,
    tags: s.tags,
    price_paise: s.price_paise,
    image_url: s.image_url,
    city: s.city,
    branch_id: s.branch_id,
    branch_name: s.branch_name,
    available,
    status: stockStatus(available, lowStock),
    rev: s.rev,
    updated_at: updatedAtIso,
  };
}
