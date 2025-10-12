// app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'

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
    const { amount, currency, description } = await request.json()

    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: 'Montant minimum de 10$ requis' },
        { status: 400 }
      )
    }

    const accessToken = await getPayPalAccessToken()

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency || 'USD',
            value: amount.toFixed(2),
          },
          description: description || `Agent Balance Purchase - ${amount}$`,
        }],
        application_context: {
          brand_name: 'Your Platform Name',
          landing_page: 'LOGIN', // Show login page first (PayPal account)
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/agent/balance/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/agent/balance/cancel`,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create order')
    }

    return NextResponse.json({ id: data.id, status: data.status })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}