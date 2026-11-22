import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CATEGORIES } from '@/data/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const products = db.getProducts();
    const stats = db.getDashboardStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      products,
      stats,
      categories: CATEGORIES,
      lowStockThreshold: 10,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
