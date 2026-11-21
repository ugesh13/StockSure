import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const orders = db.getOrders();

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'processing'
    ).length;
    const completedOrders = orders.filter(
      (o) => o.status === 'completed' || o.status === 'delivered'
    ).length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      orders,
      summary: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, message: 'New order status is required' },
        { status: 400 }
      );
    }

    const updated = db.updateOrderStatus(orderId, status, paymentStatus);

    return NextResponse.json({
      success: true,
      message: `Order #${updated.id} status updated to "${updated.status}"`,
      order: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update order status' },
      { status: 400 }
    );
  }
}
