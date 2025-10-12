import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'USD', description, agentId } = await request.json()

    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: 'Montant minimum de 10$ requis' },
        { status: 400 }
      )
    }

    const accessToken = await getPayPalAccessToken()
    
    const response = await fetch(`${process.env.PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            description: description,
          },
        ],
        application_context: {
          brand_name: 'BETADAME',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agent?tab=buy_balance&success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agent?tab=buy_balance&cancelled=true`,
        },
      }),
    })

    const order = await response.json()

    if (!response.ok) {
      throw new Error(order.message || 'Erreur PayPal')
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating PayPal order:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const response = await fetch(`${process.env.PAYPAL_API_URL}/v1/oauth2/token`, {
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