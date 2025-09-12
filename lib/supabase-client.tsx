// lib/supabase-client.ts
'use client';

import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';
import type { AuthError } from '@supabase/supabase-js';

interface SupabaseContextType {
  supabase: ReturnType<typeof createClientComponentClient<Database>>;
  signIn: (credentials: { email: string; password: string }) => Promise<{ error: AuthError | null }>;
  signUp: (credentials: { email: string; password: string }) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      router.refresh();
      router.push('/lobby');
    }
    return { error };
  }, [supabase, router]);

  const signUp = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }, [supabase, router]);

  const value = useMemo(() => ({
    supabase,
    signIn,
    signUp,
    signOut
  }), [supabase, signIn, signUp, signOut]);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
