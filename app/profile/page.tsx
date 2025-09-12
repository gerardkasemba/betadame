'use client';
import { useSupabase } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';

interface ProfileData {
  age: number;
  preferred_payment_method: string;
  balance: number;
}

export default function Profile() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAndProfile() {
      try {
        setLoading(true);

        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        setUser(currentUser);

        if (currentUser) {
          // Get user profile
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('age, preferred_payment_method, balance')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (profileError) {
            if (profileError.code === 'PGRST116') {
              setProfile(null);
              setError('Profil non trouvé. Veuillez compléter votre profil.');
            } else {
              throw profileError;
            }
          } else {
            setProfile(profileData);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Erreur inconnue');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndProfile();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Votre Profil</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Votre Profil</h1>

      {error && (
        <p className="text-congoleseRed mb-4 p-2 rounded bg-red-100">Erreur : {error}</p>
      )}

      {!user ? (
        <p className="text-congoleseRed">Utilisateur non connecté</p>
      ) : !profile ? (
        <div>
          <p className="text-congoleseYellow mb-4">Profil non trouvé. Veuillez compléter votre profil.</p>
          <button
            onClick={() => window.location.href = '/complete-profile'}
            className="bg-congoleseYellow text-congoleseBlue px-4 py-2 rounded hover:bg-opacity-80"
          >
            Compléter le profil
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p><strong>Email :</strong> {user.email}</p>
          <p><strong>Âge :</strong> {profile.age}</p>
          <p><strong>Méthode de paiement :</strong> {profile.preferred_payment_method.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Solde :</strong> {profile.balance.toFixed(2)} CDF</p>
        </div>
      )}
    </div>
  );
}
