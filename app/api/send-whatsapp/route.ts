import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { phoneNumber, message } = await req.json();

  console.log('📱 WhatsApp API Request:', {
    phoneNumber,
    messageLength: message?.length,
    hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN
  });

  // Validate required environment variables
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error('❌ Missing WhatsApp environment variables');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'WhatsApp configuration missing',
        details: {
          missingPhoneNumberId: !process.env.WHATSAPP_PHONE_NUMBER_ID,
          missingAccessToken: !process.env.WHATSAPP_ACCESS_TOKEN
        }
      }), 
      { status: 500 }
    );
  }

  // Validate input
  if (!phoneNumber || !message) {
    console.error('❌ Missing phoneNumber or message');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'phoneNumber and message are required' 
      }), 
      { status: 400 }
    );
  }

  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    console.log('🚀 Sending WhatsApp message to:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await res.json();
    
    console.log('📨 WhatsApp API Response:', {
      status: res.status,
      statusText: res.statusText,
      data: data
    });

    if (!res.ok) {
      console.error('❌ WhatsApp API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error?.message || 'WhatsApp API error',
          details: data.error
        }), 
        { status: res.status }
      );
    }

    console.log('✅ WhatsApp message sent successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        messageId: data.messages?.[0]?.id 
      }), 
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500 }
    );
  }
}