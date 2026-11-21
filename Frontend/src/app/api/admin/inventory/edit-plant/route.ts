import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, updates } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Updates payload is required' },
        { status: 400 }
      );
    }

    const updated = db.updateProductDetails(productId, updates);

    return NextResponse.json({
      success: true,
      message: `Updated details for ${updated.name}`,
      product: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to edit plant' },
      { status: 400 }
    );
  }
}
