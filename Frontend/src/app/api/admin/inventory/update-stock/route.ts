import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, adjustmentType, quantity, reason } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!['add', 'reduce', 'set'].includes(adjustmentType)) {
      return NextResponse.json(
        { success: false, message: 'Adjustment type must be add, reduce, or set' },
        { status: 400 }
      );
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return NextResponse.json(
        { success: false, message: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }

    const { product, log } = db.updateProductStock(
      productId,
      adjustmentType,
      numQty,
      reason
    );

    const stats = db.getDashboardStats();

    return NextResponse.json({
      success: true,
      message: `Stock successfully updated for ${product.name}`,
      product,
      log,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update stock' },
      { status: 400 }
    );
  }
}
