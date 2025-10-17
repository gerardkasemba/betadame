// app/api/process-timeouts/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ... (keep all the interfaces)

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting timeout processing via API...')
    
    const results = await Promise.all([
      processExpiredDeposits(),
      processExpiredWithdrawals(),
      processTontinePayments(),
      processTontinePayouts() // Add this
    ])

    const processedDeposits = results[0]
    const processedWithdrawals = results[1]
    const processedTontines = results[2]
    const processedPayouts = results[3]

    return NextResponse.json({ 
      success: true,
      processed: {
        deposits: processedDeposits,
        withdrawals: processedWithdrawals,
        tontinePayments: processedTontines,
        tontinePayouts: processedPayouts
      },
      message: `Processed ${processedDeposits} expired deposits, ${processedWithdrawals} expired withdrawals, ${processedTontines} tontine payments, and ${processedPayouts} tontine payouts`
    })
  } catch (error: any) {
    console.error('💥 Error in timeout processing API:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}

// ... (keep processExpiredDeposits, processExpiredWithdrawals, etc.)

// Add this new function
async function processTontinePayouts(): Promise<number> {
  try {
    console.log('💸 Checking for completed tontine cycles...')

    const { data: activeCycles, error: cyclesError } = await supabase
      .from('tontine_cycles')
      .select(`
        id,
        cycle_number,
        tontine_group_id,
        status,
        tontine_groups!inner (
          id,
          name,
          contribution_amount,
          status,
          payment_schedule
        )
      `)
      .eq('status', 'active')

    if (cyclesError) {
      console.error('❌ Error fetching active cycles:', cyclesError)
      return 0
    }

    if (!activeCycles || activeCycles.length === 0) {
      console.log('✅ No active cycles to process')
      return 0
    }

    console.log(`🔄 Checking ${activeCycles.length} active cycles for completion`)

    let processedCount = 0
    for (const cycle of activeCycles) {
      const success = await checkAndProcessPayout(cycle)
      if (success) processedCount++
    }

    console.log(`✅ Successfully processed ${processedCount} tontine payouts`)
    return processedCount
  } catch (error) {
    console.error('❌ Error processing tontine payouts:', error)
    return 0
  }
}

async function checkAndProcessPayout(cycle: any): Promise<boolean> {
  try {
    const tontineGroup = cycle.tontine_groups

    if (tontineGroup.status !== 'active') {
      console.log(`⏭️ Skipping inactive tontine: ${tontineGroup.name}`)
      return false
    }

    const { data: members, error: membersError } = await supabase
      .from('tontine_members')
      .select('user_id, position')
      .eq('tontine_group_id', tontineGroup.id)
      .eq('status', 'active')
      .order('position', { ascending: true })

    if (membersError || !members || members.length === 0) {
      return false
    }

    const { data: contributions, error: contributionsError } = await supabase
      .from('tontine_contributions')
      .select('id, user_id, status, amount')
      .eq('cycle_id', cycle.id)

    if (contributionsError) {
      console.error('❌ Error fetching contributions:', contributionsError)
      return false
    }

    const paidContributions = contributions?.filter(c => c.status === 'paid') || []
    const allMembersPaid = members.every(member =>
      paidContributions.some(contrib => contrib.user_id === member.user_id)
    )

    if (!allMembersPaid) {
      console.log(`⏳ Cycle ${cycle.cycle_number} of ${tontineGroup.name} not complete yet (${paidContributions.length}/${members.length} paid)`)
      return false
    }

    console.log(`✅ Cycle ${cycle.cycle_number} of ${tontineGroup.name} is complete! Processing payout...`)

    const { data: existingPayouts } = await supabase
      .from('tontine_payouts')
      .select('recipient_id, status')
      .eq('tontine_group_id', tontineGroup.id)
      .eq('status', 'paid')

    const paidRecipients = new Set(existingPayouts?.map(p => p.recipient_id) || [])
    const nextRecipient = members.find(m => !paidRecipients.has(m.user_id))

    if (!nextRecipient) {
      console.log(`🎉 All members have been paid! Completing tontine ${tontineGroup.name}`)
      
      await supabase
        .from('tontine_groups')
        .update({ status: 'completed' })
        .eq('id', tontineGroup.id)

      await supabase
        .from('tontine_cycles')
        .update({ status: 'completed' })
        .eq('id', cycle.id)

      return false
    }

    const totalAmount = paidContributions.reduce((sum, c) => sum + c.amount, 0)

    console.log(`💰 Paying ${totalAmount} FC to member at position ${nextRecipient.position}`)

    const { data: existingPayout } = await supabase
      .from('tontine_payouts')
      .select('id, status')
      .eq('cycle_id', cycle.id)
      .eq('recipient_id', nextRecipient.user_id)
      .maybeSingle()

    if (existingPayout?.status === 'paid') {
      console.log(`✅ Payout already processed for this cycle`)
      return false
    }

    const { data: recipientProfile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, username')
      .eq('id', nextRecipient.user_id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching recipient profile:', profileError)
      return false
    }

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({
        balance: (recipientProfile.balance || 0) + totalAmount
      })
      .eq('id', nextRecipient.user_id)

    if (balanceError) {
      console.error('❌ Error updating recipient balance:', balanceError)
      return false
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: nextRecipient.user_id,
        type: 'tontine_payout',
        amount: totalAmount,
        status: 'completed',
        description: `Paiement tontine: ${tontineGroup.name} - Cycle ${cycle.cycle_number}`,
        reference: `TONTINE_PAYOUT_${tontineGroup.id}_CYCLE_${cycle.cycle_number}_${Date.now()}`,
        metadata: {
          tontine_group_id: tontineGroup.id,
          cycle_id: cycle.id,
          cycle_number: cycle.cycle_number,
          recipient_position: nextRecipient.position
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('❌ Error creating payout transaction:', transactionError)
      await supabase
        .from('profiles')
        .update({ balance: recipientProfile.balance })
        .eq('id', nextRecipient.user_id)
      return false
    }

    if (existingPayout) {
      await supabase
        .from('tontine_payouts')
        .update({
          amount: totalAmount,
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: transaction.id
        })
        .eq('id', existingPayout.id)
    } else {
      await supabase
        .from('tontine_payouts')
        .insert({
          tontine_group_id: tontineGroup.id,
          cycle_id: cycle.id,
          recipient_id: nextRecipient.user_id,
          amount: totalAmount,
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: transaction.id
        })
    }

    await supabase
      .from('tontine_cycles')
      .update({ status: 'completed' })
      .eq('id', cycle.id)

    const remainingMembers = members.filter(m => 
      !paidRecipients.has(m.user_id) && m.user_id !== nextRecipient.user_id
    )

    if (remainingMembers.length > 0) {
      const nextDueDate = new Date()
      switch (tontineGroup.payment_schedule || 'weekly') {
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7)
          break
        case 'bi-weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 14)
          break
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          break
      }

      await supabase
        .from('tontine_cycles')
        .insert({
          tontine_group_id: tontineGroup.id,
          cycle_number: cycle.cycle_number + 1,
          due_date: nextDueDate.toISOString().split('T')[0],
          status: 'active'
        })

      console.log(`✅ Created cycle ${cycle.cycle_number + 1} for ${tontineGroup.name}`)
    } else {
      await supabase
        .from('tontine_groups')
        .update({ status: 'completed' })
        .eq('id', tontineGroup.id)

      console.log(`🎉 Tontine ${tontineGroup.name} has been completed!`)
    }

    console.log(`✅ Payout of ${totalAmount} FC sent to ${recipientProfile.username || nextRecipient.user_id}`)

    // Process scheduled departures
    console.log(`🔍 Checking for scheduled departures after cycle ${cycle.cycle_number}...`)

    const { data: pendingLeaves, error: leavesError } = await supabase
      .from('tontine_leave_requests')
      .select('*')
      .eq('tontine_group_id', tontineGroup.id)
      .eq('status', 'pending')
      .lte('effective_after_cycle', cycle.cycle_number)

    if (leavesError) {
      console.error('❌ Error fetching pending leave requests:', leavesError)
      return true
    }

    if (pendingLeaves && pendingLeaves.length > 0) {
      console.log(`🔄 Processing ${pendingLeaves.length} scheduled departures`)

      for (const leave of pendingLeaves) {
        try {
          await supabase
            .from('tontine_members')
            .update({ 
              status: 'left',
              left_at: new Date().toISOString()
            })
            .eq('tontine_group_id', tontineGroup.id)
            .eq('user_id', leave.user_id)

          await supabase
            .from('tontine_leave_requests')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', leave.id)

          console.log(`✅ User ${leave.user_id} has left tontine ${tontineGroup.name} after cycle ${cycle.cycle_number}`)

        } catch (error) {
          console.error(`❌ Error processing departure for user ${leave.user_id}:`, error)
        }
      }
    } else {
      console.log('✅ No scheduled departures to process')
    }

    return true
  } catch (error) {
    console.error('❌ Error checking and processing payout:', error)
    return false
  }
}