// server/your-route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side
);

export async function POST(request: Request) {
  const { userId } = await request.json();

  // Fetch user
  const { data: user, error } = await supabase
    .from('users')
    .select('preferred_payment_method')
    .eq('id', userId)
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  // Route to appropriate payment gateway
  if (user.preferred_payment_method === 'orange_money') {
    // Call Orange Money API
  } else if (user.preferred_payment_method === 'm_pesa') {
    // Call MTN MoMo API
  } else if (user.preferred_payment_method === 'airtel_money') {
    // Call Airtel Money API
  }

  return NextResponse.json({ success: true });
}
