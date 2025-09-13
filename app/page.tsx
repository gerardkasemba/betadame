'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { 
  FiMail, 
  FiLock, 
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiSmartphone,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';

export default function Login() {
  const { supabase } = useSupabase();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    // Validate inputs
    if (!email || !password) {
      setError('Veuillez entrer votre email et mot de passe.');
      setIsLoading(false);
      return;
    }

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Erreur de connexion: ' + error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSuccess('Connexion réussie! Redirection en cours...');
        
        // Redirect to lobby after a short delay
        setTimeout(() => {
          router.push('/lobby');
        }, 1000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Erreur inattendue: ' + err.message);
      } else {
        setError('Une erreur inattendue s\'est produite.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiSmartphone className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Connexion
          </h1>
          <p className="text-gray-600 text-sm">
            Content de vous revoir ! Connectez-vous à votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <FiCheckCircle className="mr-2" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <FiAlertCircle className="mr-2" />
              {error}
            </div>
          )}

          {/* Email Field */}
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
                className="w-full pl-10 text-[#222] pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
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
                className="w-full pl-10 pr-12 text-[#222] py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                {showPassword ? <FiEyeOff className="text-gray-400" /> : <FiEye className="text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                Se connecter
                <FiArrowRight className="ml-2" />
              </>
            )}
          </button>

          {/* Additional Links */}
          <div className="text-center space-y-3 pt-4">
            <Link 
              href="/auth/forgot-password" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium block"
            >
              Mot de passe oublié ?
            </Link>
            <p className="text-gray-600 text-sm">
              Pas encore inscrit ?{' '}
              <Link 
                href="/auth/register" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Rejoignez-nous
              </Link>
            </p>
          </div>
        </form>

        {/* App-like Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            En vous connectant, vous acceptez nos{' '}
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