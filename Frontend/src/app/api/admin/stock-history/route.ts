import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || undefined;

    const history = db.getStockHistory(productId);

    // Summary calculations
    const totalMovements = history.length;
    let totalAdded = 0;
    let totalReduced = 0;

    for (const log of history) {
      if (log.change > 0) {
        totalAdded += log.change;
      } else if (log.change < 0) {
        totalReduced += Math.abs(log.change);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      history,
      summary: {
        totalMovements,
        totalAdded,
        totalReduced,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch stock history' },
      { status: 500 }
    );
  }
}
