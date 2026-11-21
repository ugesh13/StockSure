import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fuzzyMatches } from '@/lib/fuzzy';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const inStockOnly = searchParams.get('inStock') === 'true';
    const sort = searchParams.get('sort') || 'recommended';

    let products = [...db.getProducts()];

    // 1. Category filter
    if (category && category !== 'all') {
      products = products.filter((p) => p.category === category);
    }

    // 2. Price filter
    products = products.filter((p) => p.price >= minPrice && p.price <= maxPrice);

    // 3. Stock filter
    if (inStockOnly) {
      products = products.filter((p) => p.stock > 0);
    }

    // 4. Fuzzy search
    if (search.trim()) {
      products = products.filter((p) => {
        const fullSearchableText = `${p.name} ${p.scientificName} ${p.categoryLabel} ${p.description} ${p.features.join(' ')}`;
        return fuzzyMatches(fullSearchableText, search);
      });
    }

    // 5. Sorting
    if (sort === 'price-low') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'bestseller') {
      products.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
    }

    // Sanitize to prevent exposing shopkeeper-only costPrice to customers
    const sanitizedProducts = products.map(({ costPrice, ...rest }: any) => rest);

    return NextResponse.json({
      success: true,
      count: sanitizedProducts.length,
      products: sanitizedProducts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
