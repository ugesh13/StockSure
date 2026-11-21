import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerEmail, shippingAddress, paymentMethod, items } = body;

    // Validation
    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please enter your full name.' },
        { status: 400 }
      );
    }

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode) {
      return NextResponse.json(
        { success: false, message: 'Complete delivery address is required.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Your shopping cart is empty.' },
        { status: 400 }
      );
    }

    // Process order in real database with stock check
    const order = db.createOrder({
      customerName,
      customerEmail,
      shippingAddress,
      paymentMethod: paymentMethod || 'Card / Apple Pay',
      items,
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully! We are preparing your botanical specimens.',
      order,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Unable to place order. Please check item availability.',
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  const orders = db.getOrders();
  return NextResponse.json({ success: true, count: orders.length, orders });
}
