import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'


const PAYPAL_API = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64')

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID requis' },
        { status: 400 }
      )
    }

    const accessToken = await getPayPalAccessToken()

    // Capture the order
    const response = await fetch(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok || data.status !== 'COMPLETED') {
      throw new Error(data.message || 'Failed to capture payment')
    }

    // Update agent balance in database
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Add transaction record
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'agent_balance_purchase',
      amount: amount,
      status: 'completed',
      payment_method: 'paypal',
      reference: orderId,
      metadata: {
        paypal_order_id: orderId,
        capture_id: data.id,
        payer_email: data.payer?.email_address,
      }
    })

    // Update agent profile balance
    await supabase.rpc('update_agent_balance', {
      p_agent_id: user.id,
      p_amount: amount
    })

    return NextResponse.json({
      success: true,
      orderId,
      captureId: data.id,
      status: data.status,
    })
  } catch (error) {
    console.error('Capture order error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la capture du paiement' },
      { status: 500 }
    )
  }
}