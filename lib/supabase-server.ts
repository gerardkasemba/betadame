// lib/supabase-server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// Create and cache the cookie store
let cookieStore: ReturnType<typeof cookies>;

const getCookieStore = () => {
  if (!cookieStore) {
    cookieStore = cookies(); // ✅ no await here
  }
  return cookieStore;
};

// Create supabase client with proper cookie handling
const createSupabaseClient = () => {
  const cookieStore = getCookieStore();
  return createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
};

// Helper function to fetch open games
export const getOpenGames = async () => {
  const supabase = createSupabaseClient();

  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'open')
    .gt('closes_at', new Date().toISOString());

  return { games, error };
};

export const getSession = async () => {
  const supabase = createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

export const getUser = async () => {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};
