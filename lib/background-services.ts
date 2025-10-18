import { createClient } from '@/lib/supabase/client'

interface Agent {
  id: string
  available_balance: number
  strikes: number
  region: string | null
  agent_payment_accounts: Array<{
    payment_method_id: string
    is_verified: boolean
  }>
}

interface Withdrawal {
  id: string
  reference: string
  user_id: string
  agent_id: string
  amount: number
  payment_method_id: string
  metadata: any
  profiles: Array<{ region: string }> | { region: string }
}

interface TontineCycle {
  id: string
  cycle_number: number
  due_date: string
  tontine_group_id: string
  tontine_groups: {
    id: string
    name: string
    contribution_amount: number
    status: string
    payment_schedule?: string
  }
}

interface TontineMember {
  user_id: string
  position: number
  tontine_group_id: string
}

export class TimeoutService {
  private intervalId: NodeJS.Timeout | null = null
  private supabase = createClient()
  private isProcessing = false

  start() {
    if (this.intervalId) return // Already running

    console.log('🚀 Starting timeout service...')
    
    // Run every 30 seconds
    this.intervalId = setInterval(() => {
      this.processTimeouts()
    }, 30000)

    // Run immediately on start
    this.processTimeouts()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('🛑 Stopped timeout service')
    }
  }

  private async processTimeouts() {
    if (this.isProcessing) {
      console.log('⏸️ Already processing timeouts, skipping...')
      return
    }

    this.isProcessing = true

    try {
      await Promise.all([
        this.processExpiredDeposits(),
        this.processExpiredWithdrawals(),
        this.processTontinePayments(),
        this.processTontinePayouts()
      ])
    } catch (error) {
      console.error('💥 Error processing timeouts:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processExpiredDeposits() {
    try {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()

      const { data: expiredDeposits, error } = await this.supabase
        .from('transactions')
        .select('id, reference, user_id, amount, agent_id')
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .lt('created_at', threeMinutesAgo)

      if (error) {
        console.error('❌ Error fetching expired deposits:', error)
        return
      }

      if (!expiredDeposits || expiredDeposits.length === 0) {
        return
      }

      console.log(`🔄 Processing ${expiredDeposits.length} expired deposits`)

      for (const deposit of expiredDeposits) {
        const { error: updateError } = await this.supabase
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              failure_reason: 'Transaction expirée - délai de 3 minutes dépassé',
              workflow_stage: 'timed_out',
              timed_out_at: new Date().toISOString()
            }
          })
          .eq('id', deposit.id)
          .eq('status', 'pending')

        if (!updateError) {
          console.log(`✅ Deposit ${deposit.reference} auto-failed`)
        }
      }
    } catch (error) {
      console.error('❌ Error processing expired deposits:', error)
    }
  }

  private async processExpiredWithdrawals() {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

      const { data: expiredWithdrawals, error } = await this.supabase
        .from('transactions')
        .select(`
          id,
          reference,
          user_id,
          agent_id,
          amount,
          payment_method_id,
          metadata,
          profiles!inner (region)
        `)
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .lt('created_at', oneMinuteAgo)
        .not('agent_id', 'is', null)

      if (error) {
        console.error('❌ Error fetching expired withdrawals:', error)
        return
      }

      if (!expiredWithdrawals || expiredWithdrawals.length === 0) {
        return
      }

      console.log(`🔄 Processing ${expiredWithdrawals.length} expired withdrawals`)

      for (const withdrawal of expiredWithdrawals) {
        await this.reassignWithdrawal(withdrawal as Withdrawal)
      }
    } catch (error) {
      console.error('❌ Error processing expired withdrawals:', error)
    }
  }

  private async reassignWithdrawal(withdrawal: Withdrawal) {
    try {
      const originalAgentId = withdrawal.agent_id
      const userRegion = Array.isArray(withdrawal.profiles) 
        ? withdrawal.profiles[0]?.region 
        : withdrawal.profiles?.region
      const requiredBalance = withdrawal.amount * 0.92

      console.log(`🔄 Reassigning withdrawal ${withdrawal.reference}`)

      const { data: currentAgent, error: agentError } = await this.supabase
        .from('agents')
        .select('strikes')
        .eq('id', originalAgentId)
        .single()

      if (agentError) {
        console.error('❌ Error getting agent strikes:', agentError)
      } else {
        const { error: strikeError } = await this.supabase
          .from('agents')
          .update({
            strikes: (currentAgent?.strikes || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalAgentId)

        if (strikeError) {
          console.error('❌ Error giving strike:', strikeError)
        } else {
          console.log(`✅ Strike given to agent ${originalAgentId}`)
        }
      }

      const newAgent = await this.findAvailableAgentForWithdrawal(
        originalAgentId,
        withdrawal.payment_method_id,
        requiredBalance,
        userRegion
      )

      if (newAgent) {
        const { error: reassignError } = await this.supabase
          .from('transactions')
          .update({
            agent_id: newAgent.id,
            created_at: new Date().toISOString(),
            metadata: {
              ...withdrawal.metadata,
              reassigned_from: originalAgentId,
              reassigned_at: new Date().toISOString(),
              reassignment_count: (withdrawal.metadata?.reassignment_count || 0) + 1,
              reassignment_reason: 'Agent timeout - 1 minute expired - Strike given',
              required_balance: requiredBalance
            }
          })
          .eq('id', withdrawal.id)
          .eq('status', 'pending')

        if (reassignError) {
          console.error('❌ Error reassigning withdrawal:', reassignError)
        } else {
          console.log(`✅ Withdrawal ${withdrawal.reference} reassigned to agent ${newAgent.id}`)
        }
      } else {
        console.log(`❌ No agent available for withdrawal ${withdrawal.reference}, refunding...`)

        const { data: userProfile, error: userError } = await this.supabase
          .from('profiles')
          .select('balance')
          .eq('id', withdrawal.user_id)
          .single()

        if (!userError && userProfile) {
          const { error: refundError } = await this.supabase
            .from('profiles')
            .update({
              balance: (userProfile.balance || 0) + withdrawal.amount
            })
            .eq('id', withdrawal.user_id)

          if (refundError) {
            console.error('❌ Error refunding user:', refundError)
          }
        }

        await this.supabase
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              ...withdrawal.metadata,
              failure_reason: 'Aucun agent disponible après expiration - Remboursement automatique',
              required_balance: requiredBalance,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', withdrawal.id)
          .eq('status', 'pending')

        console.log(`✅ User refunded for withdrawal ${withdrawal.reference}`)
      }
    } catch (error) {
      console.error(`❌ Error reassigning withdrawal ${withdrawal.reference}:`, error)
    }
  }

  private async findAvailableAgentForWithdrawal(
    excludeAgentId: string,
    paymentMethodId: string,
    requiredBalance: number,
    userRegion: string | null
  ): Promise<Agent | null> {
    try {
      let query = this.supabase
        .from('agents')
        .select(`
          id,
          available_balance,
          strikes,
          region,
          agent_payment_accounts!inner (
            payment_method_id,
            is_verified
          )
        `)
        .neq('id', excludeAgentId)
        .eq('is_active', true)
        .eq('online_status', 'online')
        .eq('verification_status', 'approved')
        .gte('available_balance', requiredBalance)
        .eq('agent_payment_accounts.payment_method_id', paymentMethodId)
        .eq('agent_payment_accounts.is_verified', true)

      if (userRegion) {
        query = query.eq('region', userRegion)
      }

      const { data: agents, error } = await query

      if (error) {
        console.error('❌ Error finding agents:', error)
        return null
      }

      if (!agents || agents.length === 0) {
        if (userRegion) {
          console.log('🌍 No agent in same region, trying all regions...')
          return await this.findAvailableAgentForWithdrawal(
            excludeAgentId,
            paymentMethodId,
            requiredBalance,
            null
          )
        }
        return null
      }

      const agentIds = agents.map(a => a.id)
      const { data: pendingTransactions } = await this.supabase
        .from('transactions')
        .select('agent_id, status')
        .in('agent_id', agentIds)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())

      const pendingMap = new Map<string, number>()
      agentIds.forEach(id => pendingMap.set(id, 0))
      pendingTransactions?.forEach(tx => {
        const count = pendingMap.get(tx.agent_id) || 0
        pendingMap.set(tx.agent_id, count + 1)
      })

      const availableAgents = agents.filter(agent => 
        (pendingMap.get(agent.id) || 0) < 3
      )

      if (availableAgents.length === 0) {
        return null
      }

      availableAgents.sort((a, b) => {
        if (a.strikes !== b.strikes) {
          return a.strikes - b.strikes
        }
        return b.available_balance - a.available_balance
      })

      return availableAgents[0]
    } catch (error) {
      console.error('❌ Error finding available agent:', error)
      return null
    }
  }

  // ============================================
  // TONTINE AUTO-PAYMENT PROCESSING
  // ============================================
  private async processTontinePayments() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      console.log(`💰 Checking tontine payments for ${todayStr}`)

      const { data: dueCycles, error: cyclesError } = await this.supabase
        .from('tontine_cycles')
        .select(`
          id,
          cycle_number,
          due_date,
          tontine_group_id,
          tontine_groups!inner (
            id,
            name,
            contribution_amount,
            status
          )
        `)
        .eq('status', 'active')
        .lte('due_date', todayStr)

      if (cyclesError) {
        console.error('❌ Error fetching due tontine cycles:', cyclesError)
        return
      }

      if (!dueCycles || dueCycles.length === 0) {
        console.log('✅ No tontine payments due today')
        return
      }

      console.log(`🔄 Processing ${dueCycles.length} due tontine cycles`)

      // Use type assertion
      for (const cycle of dueCycles as unknown as TontineCycle[]) {
        await this.processTontineCyclePayments(cycle)
      }
    } catch (error) {
      console.error('❌ Error processing tontine payments:', error)
    }
  }

  private async processTontineCyclePayments(cycle: TontineCycle) {
    try {
      const tontineGroup = cycle.tontine_groups

      if (tontineGroup.status !== 'active') {
        console.log(`⏭️ Skipping inactive tontine: ${tontineGroup.name}`)
        return
      }

      console.log(`💸 Processing payments for tontine: ${tontineGroup.name} (Cycle ${cycle.cycle_number})`)

      const { data: members, error: membersError } = await this.supabase
        .from('tontine_members')
        .select('user_id, position, tontine_group_id')
        .eq('tontine_group_id', tontineGroup.id)
        .eq('status', 'active')

      if (membersError) {
        console.error('❌ Error fetching tontine members:', membersError)
        return
      }

      if (!members || members.length === 0) {
        console.log(`⚠️ No members found for tontine: ${tontineGroup.name}`)
        return
      }

      console.log(`👥 Found ${members.length} members to process`)

      for (const member of members as TontineMember[]) {
        await this.processIndividualTontinePayment(cycle, tontineGroup, member)
      }
    } catch (error) {
      console.error(`❌ Error processing cycle payments for ${cycle.id}:`, error)
    }
  }

  private async processIndividualTontinePayment(
    cycle: TontineCycle,
    tontineGroup: TontineCycle['tontine_groups'],
    member: TontineMember
  ) {
    try {
      const { data: existingContribution } = await this.supabase
        .from('tontine_contributions')
        .select('id, status')
        .eq('cycle_id', cycle.id)
        .eq('user_id', member.user_id)
        .maybeSingle()

      if (existingContribution?.status === 'paid') {
        console.log(`✅ User ${member.user_id} already paid for cycle ${cycle.cycle_number}`)
        return
      }

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('balance, auto_tontine_payment, username')
        .eq('id', member.user_id)
        .single()

      if (profileError) {
        console.error(`❌ Error fetching profile for user ${member.user_id}:`, profileError)
        return
      }

      const autoPayEnabled = profile.auto_tontine_payment !== false

      if (!autoPayEnabled) {
        console.log(`⏭️ Auto-payment disabled for user ${profile.username || member.user_id}`)
        if (!existingContribution) {
          await this.supabase
            .from('tontine_contributions')
            .insert({
              tontine_group_id: tontineGroup.id,
              cycle_id: cycle.id,
              user_id: member.user_id,
              amount: tontineGroup.contribution_amount,
              status: 'missed'
            })
        } else if (existingContribution.status !== 'paid') {
          await this.supabase
            .from('tontine_contributions')
            .update({ status: 'missed' })
            .eq('id', existingContribution.id)
        }
        return
      }

      if (profile.balance >= tontineGroup.contribution_amount) {
        console.log(`💳 Auto-paying ${tontineGroup.contribution_amount} FC for user ${profile.username || member.user_id}`)

        const { error: balanceError } = await this.supabase
          .from('profiles')
          .update({ 
            balance: profile.balance - tontineGroup.contribution_amount 
          })
          .eq('id', member.user_id)

        if (balanceError) {
          console.error(`❌ Error updating balance for user ${member.user_id}:`, balanceError)
          return
        }

        const { data: transaction, error: transactionError } = await this.supabase
          .from('transactions')
          .insert({
            user_id: member.user_id,
            type: 'tontine_contribution',
            amount: -tontineGroup.contribution_amount,
            status: 'completed',
            description: `Paiement automatique tontine: ${tontineGroup.name} - Cycle ${cycle.cycle_number}`,
            reference: `AUTO_TONTINE_${tontineGroup.id}_CYCLE_${cycle.cycle_number}_${Date.now()}`,
            metadata: {
              tontine_group_id: tontineGroup.id,
              cycle_id: cycle.id,
              cycle_number: cycle.cycle_number,
              auto_payment: true
            }
          })
          .select()
          .single()

        if (transactionError) {
          console.error(`❌ Error creating transaction for user ${member.user_id}:`, transactionError)
          await this.supabase
            .from('profiles')
            .update({ balance: profile.balance })
            .eq('id', member.user_id)
          return
        }

        if (existingContribution) {
          await this.supabase
            .from('tontine_contributions')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              transaction_id: transaction.id
            })
            .eq('id', existingContribution.id)
        } else {
          await this.supabase
            .from('tontine_contributions')
            .insert({
              tontine_group_id: tontineGroup.id,
              cycle_id: cycle.id,
              user_id: member.user_id,
              amount: tontineGroup.contribution_amount,
              status: 'paid',
              paid_at: new Date().toISOString(),
              transaction_id: transaction.id
            })
        }

        console.log(`✅ Auto-payment successful for user ${profile.username || member.user_id}`)
      } else {
        console.log(`❌ Insufficient balance for user ${profile.username || member.user_id} (Has: ${profile.balance} FC, Needs: ${tontineGroup.contribution_amount} FC)`)

        if (existingContribution) {
          await this.supabase
            .from('tontine_contributions')
            .update({ status: 'missed' })
            .eq('id', existingContribution.id)
        } else {
          await this.supabase
            .from('tontine_contributions')
            .insert({
              tontine_group_id: tontineGroup.id,
              cycle_id: cycle.id,
              user_id: member.user_id,
              amount: tontineGroup.contribution_amount,
              status: 'missed'
            })
        }
      }
    } catch (error) {
      console.error(`❌ Error processing payment for user ${member.user_id}:`, error)
    }
  }

  // ============================================
  // TONTINE PAYOUT PROCESSING
  // ============================================
  private async processTontinePayouts() {
    try {
      console.log('💸 Checking for completed tontine cycles...')

      const { data: activeCycles, error: cyclesError } = await this.supabase
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
        return
      }

      if (!activeCycles || activeCycles.length === 0) {
        console.log('✅ No active cycles to process')
        return
      }

      console.log(`🔄 Checking ${activeCycles.length} active cycles for completion`)

      for (const cycle of activeCycles) {
        await this.checkAndProcessPayout(cycle)
      }
    } catch (error) {
      console.error('❌ Error processing tontine payouts:', error)
    }
  }

  private async checkAndProcessPayout(cycle: any) {
    try {
      const tontineGroup = cycle.tontine_groups

      if (tontineGroup.status !== 'active') {
        console.log(`⏭️ Skipping inactive tontine: ${tontineGroup.name}`)
        return
      }

      const { data: members, error: membersError } = await this.supabase
        .from('tontine_members')
        .select('user_id, position')
        .eq('tontine_group_id', tontineGroup.id)
        .eq('status', 'active')
        .order('position', { ascending: true })

      if (membersError || !members || members.length === 0) {
        return
      }

      const { data: contributions, error: contributionsError } = await this.supabase
        .from('tontine_contributions')
        .select('id, user_id, status, amount')
        .eq('cycle_id', cycle.id)

      if (contributionsError) {
        console.error('❌ Error fetching contributions:', contributionsError)
        return
      }

      const paidContributions = contributions?.filter(c => c.status === 'paid') || []
      const allMembersPaid = members.every(member =>
        paidContributions.some(contrib => contrib.user_id === member.user_id)
      )

      if (!allMembersPaid) {
        console.log(`⏳ Cycle ${cycle.cycle_number} of ${tontineGroup.name} not complete yet (${paidContributions.length}/${members.length} paid)`)
        return
      }

      console.log(`✅ Cycle ${cycle.cycle_number} of ${tontineGroup.name} is complete! Processing payout...`)

      const { data: existingPayouts } = await this.supabase
        .from('tontine_payouts')
        .select('recipient_id, status')
        .eq('tontine_group_id', tontineGroup.id)
        .eq('status', 'paid')

      const paidRecipients = new Set(existingPayouts?.map(p => p.recipient_id) || [])
      const nextRecipient = members.find(m => !paidRecipients.has(m.user_id))

      if (!nextRecipient) {
        console.log(`🎉 All members have been paid! Completing tontine ${tontineGroup.name}`)
        
        await this.supabase
          .from('tontine_groups')
          .update({ status: 'completed' })
          .eq('id', tontineGroup.id)

        await this.supabase
          .from('tontine_cycles')
          .update({ status: 'completed' })
          .eq('id', cycle.id)

        return
      }

      const totalAmount = paidContributions.reduce((sum, c) => sum + c.amount, 0)

      console.log(`💰 Paying ${totalAmount} FC to member at position ${nextRecipient.position}`)

      const { data: existingPayout } = await this.supabase
        .from('tontine_payouts')
        .select('id, status')
        .eq('cycle_id', cycle.id)
        .eq('recipient_id', nextRecipient.user_id)
        .maybeSingle()

      if (existingPayout?.status === 'paid') {
        console.log(`✅ Payout already processed for this cycle`)
        return
      }

      const { data: recipientProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('balance, username')
        .eq('id', nextRecipient.user_id)
        .single()

      if (profileError) {
        console.error('❌ Error fetching recipient profile:', profileError)
        return
      }

      const { error: balanceError } = await this.supabase
        .from('profiles')
        .update({
          balance: (recipientProfile.balance || 0) + totalAmount
        })
        .eq('id', nextRecipient.user_id)

      if (balanceError) {
        console.error('❌ Error updating recipient balance:', balanceError)
        return
      }

      const { data: transaction, error: transactionError } = await this.supabase
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
        await this.supabase
          .from('profiles')
          .update({ balance: recipientProfile.balance })
          .eq('id', nextRecipient.user_id)
        return
      }

      if (existingPayout) {
        await this.supabase
          .from('tontine_payouts')
          .update({
            amount: totalAmount,
            status: 'paid',
            paid_at: new Date().toISOString(),
            transaction_id: transaction.id
          })
          .eq('id', existingPayout.id)
      } else {
        await this.supabase
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

      await this.supabase
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

        await this.supabase
          .from('tontine_cycles')
          .insert({
            tontine_group_id: tontineGroup.id,
            cycle_number: cycle.cycle_number + 1,
            due_date: nextDueDate.toISOString().split('T')[0],
            status: 'active'
          })

        console.log(`✅ Created cycle ${cycle.cycle_number + 1} for ${tontineGroup.name}`)
      } else {
        await this.supabase
          .from('tontine_groups')
          .update({ status: 'completed' })
          .eq('id', tontineGroup.id)

        console.log(`🎉 Tontine ${tontineGroup.name} has been completed!`)
      }

      console.log(`✅ Payout of ${totalAmount} FC sent to ${recipientProfile.username || nextRecipient.user_id}`)

      // Process scheduled departures
      console.log(`🔍 Checking for scheduled departures after cycle ${cycle.cycle_number}...`)

      const { data: pendingLeaves, error: leavesError } = await this.supabase
        .from('tontine_leave_requests')
        .select('*')
        .eq('tontine_group_id', tontineGroup.id)
        .eq('status', 'pending')
        .lte('effective_after_cycle', cycle.cycle_number)

      if (leavesError) {
        console.error('❌ Error fetching pending leave requests:', leavesError)
        return
      }

      if (pendingLeaves && pendingLeaves.length > 0) {
        console.log(`🔄 Processing ${pendingLeaves.length} scheduled departures`)

        for (const leave of pendingLeaves) {
          try {
            await this.supabase
              .from('tontine_members')
              .update({ 
                status: 'left',
                left_at: new Date().toISOString()
              })
              .eq('tontine_group_id', tontineGroup.id)
              .eq('user_id', leave.user_id)

            await this.supabase
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

    } catch (error) {
      console.error('❌ Error checking and processing payout:', error)
    }
  }
}

// Singleton instance
export const timeoutService = new TimeoutService()