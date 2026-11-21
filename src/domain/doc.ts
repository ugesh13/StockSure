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
  image_credit?: string | null;
  image_status?: string | null;
  branch_id: number;
  branch_name: string;
  city: string;
  on_hand: number;
  reserved: number;
  buffer: number;
  rev: number;
  plant_common_name?: string | null;
  name_hi?: string | null;
  name_kn?: string | null;
  scientific_name?: string | null;
  aliases?: string[] | null;
  variant_group?: string | null;
  variant_size?: string | null;
  is_active?: boolean;
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
  image_credit?: string | null;
  image_status?: string | null;
  city: string;
  branch_id: number;
  branch_name: string;
  available: number;
  status: BaseStatus;
  rev: number;
  updated_at: string;
  plant_common_name?: string | null;
  name_hi?: string | null;
  name_kn?: string | null;
  scientific_name?: string | null;
  aliases?: string[] | null;
  variant_group?: string | null;
  variant_size?: string | null;
  is_active?: boolean;
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
    image_credit: s.image_credit ?? null,
    image_status: s.image_status ?? null,
    city: s.city,
    branch_id: s.branch_id,
    branch_name: s.branch_name,
    available,
    status: stockStatus(available, lowStock),
    rev: s.rev,
    updated_at: updatedAtIso,
    plant_common_name: s.plant_common_name ?? null,
    name_hi: s.name_hi ?? null,
    name_kn: s.name_kn ?? null,
    scientific_name: s.scientific_name ?? null,
    aliases: s.aliases ?? null,
    variant_group: s.variant_group ?? null,
    variant_size: s.variant_size ?? null,
    is_active: s.is_active ?? true,
  };
}
