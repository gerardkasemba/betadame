'use client';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMail, 
  FiLock, 
  FiRepeat, 
  FiCalendar, 
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiUserPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiDatabase
} from 'react-icons/fi';

export default function Register() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'orange_money' | 'm_pesa' | 'airtel_money'>('orange_money');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

    // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Redirect to lobby or intended destination
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirectTo') || '/lobby';
        router.push(redirectTo);
      }
    };
    
    checkSession();
  }, [supabase, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate inputs
    if (password !== repeatPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (age === '' || Number(age) < 18) {
      setError('Vous devez avoir au moins 18 ans pour jouer.');
      setLoading(false);
      return;
    }

    if (!email || !password || !paymentMethod) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    try {
      // Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            age: Number(age),
            preferred_payment_method: paymentMethod,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError('Erreur d\'inscription : ' + authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        console.log('Authenticated user:', authData.user);

        // Insert or update the user profile
        const { error: insertError } = await supabase
          .from('users')
          .upsert(
            {
              id: authData.user.id,
              email: authData.user.email,
              age: Number(age),
              preferred_payment_method: paymentMethod,
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          );

        if (insertError) {
          console.error('Profile creation failed:', insertError);
          setError(`Erreur lors de la création du profil : ${insertError.message}`);
          if (insertError.code === '23505') {
            console.log('User profile already exists');
          }
          // Continue with registration even if profile creation fails
          console.warn('User auth succeeded but profile creation failed. User can complete profile later.');
        }

        // Check if email confirmation is required
        if (authData.user.identities && authData.user.identities.length === 0) {
          setError('Cet email est déjà utilisé.');
          setLoading(false);
          return;
        }

        if (!authData.session) {
          // Email confirmation required
          setSuccess('Veuillez vérifier votre email pour activer votre compte. Un lien de confirmation a été envoyé.');
          setLoading(false);
          return;
        }

        // Redirect to lobby if auto-confirm is enabled
        router.push('/lobby');
      } else {
        setError('Erreur : utilisateur non créé.');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error('Unexpected error:', err);
      if (err instanceof Error) {
        setError('Erreur inattendue : ' + err.message);
      } else {
        setError('Une erreur inattendue s\'est produite.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiUserPlus className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Créer un compte</h1>
          <p className="text-gray-600 text-sm">Rejoignez-nous et commencez à jouer</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <FiCheckCircle className="mr-2" />
              {success}
            </div>
          )}

          {/* Error Message - Enhanced with database error specific styling */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center">
                <FiAlertCircle className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {error.includes('Database') && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                  <div className="flex items-center">
                    <FiDatabase className="mr-1" />
                    <span>Problème de connexion à la base de données</span>
                  </div>
                  <p className="mt-1">Veuillez réessayer ou contacter le support.</p>
                </div>
              )}
            </div>
          )}

          {/* Form fields remain the same as before */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full text-[#222] pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full pl-10 text-[#222] pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={loading}
              >
                {showPassword ? <FiEyeOff className="text-gray-400" /> : <FiEye className="text-gray-400" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiRepeat className="text-gray-400" />
              </div>
              <input
                type={showRepeatPassword ? "text" : "password"}
                value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className="w-full pl-10 text-[#222] pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={loading}
              >
                {showRepeatPassword ? <FiEyeOff className="text-gray-400" /> : <FiEye className="text-gray-400" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Âge (18 ans minimum)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="text-gray-400" />
              </div>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Votre âge"
                min="18"
                className="w-full pl-10 text-[#222] pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Méthode de paiement</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCreditCard className="text-gray-400" />
              </div>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'orange_money' | 'm_pesa' | 'airtel_money')}
                className="w-full text-[#222] pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                required
                disabled={loading}
              >
                <option value="orange_money">🟠 Orange Money</option>
                <option value="m_pesa">🟢 M-Pesa</option>
                <option value="airtel_money">🔵 Airtel Money</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <FiArrowRight className="text-gray-400" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                Créer mon compte
                <FiArrowRight className="ml-2" />
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <p className="text-gray-600 text-sm">
              Déjà un compte ?{' '}
              <Link 
                href="/" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Connectez-vous
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            En vous inscrivant, vous acceptez nos{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-700">
              Conditions d&apos;utilisation
            </Link>{' '}
            et notre{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}