import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Plant name is required' },
        { status: 400 }
      );
    }

    if (!data.category) {
      return NextResponse.json(
        { success: false, message: 'Category must be selected' },
        { status: 400 }
      );
    }

    if (data.price === undefined || Number(data.price) < 0 || isNaN(Number(data.price))) {
      return NextResponse.json(
        { success: false, message: 'Selling price must be a valid non-negative number' },
        { status: 400 }
      );
    }

    if (data.stock !== undefined && (Number(data.stock) < 0 || isNaN(Number(data.stock)))) {
      return NextResponse.json(
        { success: false, message: 'Stock quantity must be a non-negative integer' },
        { status: 400 }
      );
    }

    const createdProduct = db.createProduct(data);
    const stats = db.getDashboardStats();

    return NextResponse.json({
      success: true,
      message: `Successfully created "${createdProduct.name}" in shared nursery catalog`,
      product: createdProduct,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create plant' },
      { status: 400 }
    );
  }
}
