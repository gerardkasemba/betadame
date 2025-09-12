'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-client';

export default function Callback() {
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Handle auth callback (OAuth, magic link, or email confirmation)
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Callback error:', error.message);
        router.push('/auth/login?error=Erreur lors de la connexion');
        return;
      }

      if (data.session) {
        // Check if user exists in users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.session.user.id)
          .single();

        if (userError || !userData) {
          // If user doesn't exist in users table, redirect to complete profile
          router.push('/auth/register?completeProfile=true');
        } else {
          // User exists, redirect to lobby
          router.push('/lobby');
        }
      } else {
        router.push('/auth/login?error=Session non trouvée');
      }
    };

    handleCallback();
  }, [supabase, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-congoleseBlue text-white">
      <p className="text-lg">Traitement de la connexion...</p>
    </div>
  );
}