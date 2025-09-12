// lib/supabase-server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies });
};

// Helper function to fetch open games
export const getOpenGames = async () => {
  const supabase = createServerSupabaseClient();
  
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'open')
    .gt('closes_at', new Date().toISOString());

  return { games, error };
};

export const getSession = async () => {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getUser = async () => {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};