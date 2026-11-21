import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    // Log the botanical inquiry to conservatory queue
    console.log('[Verdant Conservatory Inquiry Received]:', {
      name,
      email,
      phone: phone || 'N/A',
      subject: subject || 'General Horticultural Advice',
      message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Your botanical inquiry has been received by our resident horticultural team.',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred while dispatching your inquiry.' },
      { status: 500 }
    );
  }
}
