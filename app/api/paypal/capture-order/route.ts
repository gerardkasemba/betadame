import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  try {
    const { orderId, amount, agentId } = await request.json()

    const accessToken = await getPayPalAccessToken()
    
    const response = await fetch(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    const captureData = await response.json()

    if (!response.ok) {
      throw new Error(captureData.message || 'Erreur lors de la capture du paiement')
    }

    // Payment successful - update agent balance
    if (captureData.status === 'COMPLETED') {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('platform_balance')
        .eq('id', agentId)
        .single()

      if (error) throw error

      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          platform_balance: (agent?.platform_balance || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)

      if (updateError) throw updateError

      // Record the transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          agent_id: agentId,
          type: 'deposit',
          amount: amount,
          status: 'completed',
          reference: `BAL-${Date.now()}`,
          description: `Achat de solde plateforme via PayPal - Order: ${orderId}`
        })

      if (txError) throw txError
    }

    return NextResponse.json({ 
      success: true, 
      captureData,
      message: `Solde de ${amount}$ ajouté avec succès` 
    })
  } catch (error) {
    console.error('Error capturing PayPal order:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du paiement' },
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