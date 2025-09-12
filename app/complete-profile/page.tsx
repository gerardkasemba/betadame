// app/complete-profile/page.tsx
'use client';
import { useSupabase } from '@/lib/supabase-client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompleteProfile() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [age, setAge] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'orange_money' | 'm_pesa' | 'airtel_money'>('orange_money');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (age === '' || Number(age) < 18) {
      setError('Vous devez avoir au moins 18 ans.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Utilisateur non connecté');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          age: Number(age),
          preferred_payment_method: paymentMethod,
          balance: 0,
        });

      if (insertError) throw insertError;

      router.push('/profile');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Erreur : ' + err.message);
      } else {
        setError('Erreur inconnue');
      }
    }finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Compléter votre profil</h1>
      {error && <p className="text-congoleseRed mb-4 p-2 rounded bg-red-100">{error}</p>}
      <form onSubmit={handleCompleteProfile} className="space-y-4">
        <input
          type="number"
          value={age}
          onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Âge (18+)"
          min="18"
          className="w-full p-2 rounded bg-[#0072CE] text-white border border-gray-600"
          required
          disabled={loading}
        />
        <select
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value as 'orange_money' | 'm_pesa' | 'airtel_money')}
          className="w-full p-2 rounded bg-[#0072CE] text-white border border-gray-600"
          required
          disabled={loading}
        >
          <option value="orange_money">Orange Money</option>
          <option value="m_pesa">M-Pesa</option>
          <option value="airtel_money">Airtel Money</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-congoleseYellow text-[#0072CE] px-4 py-2 rounded hover:bg-opacity-80 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Compléter le profil'}
        </button>
      </form>
    </div>
  );
}