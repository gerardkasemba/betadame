// lib/auth-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  try {
    // Extract all form data
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const username = formData.get('username') as string
    const phone_number = formData.get('phone_number') as string
    const country = formData.get('country') as string
    const state = formData.get('state') as string
    const user_type = formData.get('user_type') as string
    const date_of_birth = formData.get('date_of_birth') as string
    const gender = formData.get('gender') as string
    const preferred_language = formData.get('preferred_language') as string
    const region = formData.get('region') as string
    const notification_preferences = formData.get('notification_preferences') as string
    const security_questions = formData.get('security_questions') as string
    const referral_code = formData.get('referral_code') as string
    const terms_accepted = formData.get('terms_accepted') === 'true'
    const privacy_policy_accepted = formData.get('privacy_policy_accepted') === 'true'

    console.log('Starting registration process...')

    // Validate required fields
    const requiredFields = { 
      email, 
      password, 
      username, 
      phone_number, 
      country, 
      state, 
      user_type 
    }
    
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([key]) => key)

    if (missingFields.length > 0) {
      return { error: `Champs manquants: ${missingFields.join(', ')}` }
    }

    // Validate password strength
    if (password.length < 6) {
      return { error: 'Le mot de passe doit contenir au moins 6 caractères' }
    }

    // Prepare ALL user metadata for the trigger
    const userMetadata = {
      username: username.trim(),
      phone_number: phone_number.trim(),
      country: country,
      state: state,
      user_type: user_type,
      region: region || 'Africa',
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      preferred_language: preferred_language || 'fr',
      notification_preferences: notification_preferences 
        ? JSON.parse(notification_preferences) 
        : { email: true, sms: true, push: true },
      security_questions: security_questions ? JSON.parse(security_questions) : null,
      referral_code: referral_code && referral_code.trim() !== '' ? referral_code.trim() : null,
      terms_accepted: terms_accepted,
      privacy_policy_accepted: privacy_policy_accepted
    }

    console.log('Creating auth user with complete metadata...')

    // Single signup call - let the trigger handle profile creation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: userMetadata, // Pass ALL data here
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      
      if (authError.message.includes('already registered') || authError.message.includes('duplicate')) {
        return { error: 'Cette adresse email est déjà utilisée' }
      }
      if (authError.message.includes('password')) {
        return { error: 'Le mot de passe ne respecte pas les exigences de sécurité' }
      }
      if (authError.message.includes('email')) {
        return { error: 'Format d\'email invalide' }
      }
      
      return { error: `Erreur lors de la création du compte: ${authError.message}` }
    }

    if (!authData.user) {
      return { error: 'Aucune donnée utilisateur retournée après l\'inscription' }
    }

    console.log('Registration process completed successfully!')
    
    return { 
      success: true, 
      message: 'Inscription réussie! Veuillez vérifier votre email.',
      userId: authData.user.id
    }

  } catch (error: any) {
    console.error('Unexpected error in signUp:', error)
    return { error: `Erreur inattendue: ${error.message}` }
  }
}

// Updated test function to check trigger
export async function testProfilesTable() {
  const supabase = await createClient()
  
  try {
    // Test if we can access profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .limit(1)
    
    if (error) {
      console.error('Profiles table access error:', error)
      return { error: error.message }
    }
    
    console.log('Profiles table is accessible')
    
    // Also check if trigger exists
    const { data: triggerData } = await supabase
      .rpc('get_triggers') // You might need to create this function
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Test failed:', error)
    return { error: error.message }
  }
}

// Keep other functions the same...
export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Authentifier l'utilisateur
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  if (!authData.user) {
    return { error: 'Aucun utilisateur trouvé après authentification' }
  }

  // Récupérer le user_type depuis la table profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    return { error: 'Erreur lors de la récupération du profil utilisateur' }
  }

  if (!profile?.user_type) {
    console.error('User type not found for user:', authData.user.id)
    return { error: 'Type d\'utilisateur non défini' }
  }

  revalidatePath('/', 'layout')
  
  // Retourner le user_type au lieu de rediriger
  return { 
    success: true, 
    userType: profile.user_type,
    userId: authData.user.id
  }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/forgot-password-success')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/reset-password-success')
}