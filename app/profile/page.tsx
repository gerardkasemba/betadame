'use client';
import { useSupabase } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';
import { ProfileData } from '@/types';
import { FiUser, FiMail, FiLock, FiCreditCard, FiDollarSign, FiChevronDown, FiChevronUp, FiCheck, FiX, FiArrowDown, FiArrowUp, FiRefreshCw } from 'react-icons/fi';

interface Transaction {
  id: number;
  request_type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'completed' | 'canceled';
  reason: string | null;
  created_at: string;
  balance_before: number;
}

export default function Profile() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingAge, setEditingAge] = useState<number>(0);
  const [editingPayment, setEditingPayment] = useState<string>('');
  const [requestType, setRequestType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [showTransactions, setShowTransactions] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserAndProfile() {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(currentUser);

        if (currentUser) {
          // Get user profile
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('id, age, preferred_payment_method, balance')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (profileError) {
            if (profileError.code === 'PGRST116') {
              setProfile(null);
            } else {
              throw profileError;
            }
          } else {
            setProfile(profileData);
            if (profileData) {
              setEditingAge(profileData.age || 0);
              setEditingPayment(profileData.preferred_payment_method);
            }
          }

          // Fetch recent transactions
          const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (transError) throw transError;
          setTransactions(transData || []);
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

  // Update editing states when profile changes
  useEffect(() => {
    if (profile) {
      setEditingAge(profile.age || 0);
      setEditingPayment(profile.preferred_payment_method);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ age: editingAge, preferred_payment_method: editingPayment })
        .eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, age: editingAge, preferred_payment_method: editingPayment });
      setError(null);
      setSuccess('Profil mis à jour avec succès!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || newEmail === user.email) return;
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setError(null);
      setSuccess('Email modifié avec succès!');
      setChangingEmail(false);
      setNewEmail('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setError(null);
      setSuccess('Mot de passe modifié avec succès!');
      setChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleTransactionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !profile) {
      setError('Montant invalide.');
      return;
    }
    if (requestType === 'withdraw' && amount > profile.balance) {
      setError('Solde insuffisant pour le retrait.');
      return;
    }
    setUpdating(true);
    try {
      const { data: currentProfileData, error: fetchError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', profile.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentProfileData) {
        setError('Impossible de récupérer le solde actuel.');
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          balance_before: currentProfileData.balance,
          request_type: requestType,
          amount,
          reason: reason || null,
        });

      if (error) throw error;
      setError(null);
      setSuccess(`Demande de ${requestType === 'deposit' ? 'dépôt' : 'retrait'} envoyée!`);
      setAmount(0);
      setReason('');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh profile data to update balance
      const { data: updatedProfile } = await supabase
        .from('users')
        .select('balance')
        .eq('id', profile.id)
        .single();
      
      if (updatedProfile) {
        setProfile({ ...profile, balance: updatedProfile.balance });
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const toggleSection = (section: string) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiRefreshCw className="animate-spin mr-1" />;
      case 'completed': return <FiCheck className="mr-1" />;
      case 'canceled': return <FiX className="mr-1" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0072CE] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
            <FiUser className="mr-2" /> Votre Profil
          </h1>
          <p className="text-gray-600 mt-1">Gérez vos informations personnelles et vos transactions</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">Erreur: {error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {!user ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-red-600">Utilisateur non connecté</p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="mt-4 bg-[#0072CE] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Se connecter
            </button>
          </div>
        ) : !profile ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-yellow-600 mb-4">Profil non trouvé. Veuillez compléter votre profil.</p>
            <button
              onClick={() => window.location.href = '/complete-profile'}
              className="bg-congoleseYellow text-[#0072CE] px-4 py-2 rounded-lg hover:bg-opacity-80 transition"
            >
              Compléter le profil
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Summary Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiUser className="mr-2" /> Informations Personnelles
                </h2>
                <button
                  onClick={() => toggleSection('profile')}
                  className="text-[#0072CE] hover:text-blue-700 transition"
                >
                  {activeSection === 'profile' ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Âge</p>
                  <p className="font-medium">{profile.age || 'Non défini'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Méthode de paiement</p>
                  <p className="font-medium">{profile.preferred_payment_method.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-500">Solde actuel</p>
                  <p className="font-medium text-blue-700">{profile.balance.toFixed(2)} CDF</p>
                </div>
              </div>

              {activeSection === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="pt-4 border-t border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Âge (≥18)</label>
                    <input
                      type="number"
                      min="18"
                      value={editingAge}
                      onChange={(e) => setEditingAge(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                    <select
                      value={editingPayment}
                      onChange={(e) => setEditingPayment(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                      required
                    >
                      <option value="orange_money">Orange Money</option>
                      <option value="m_pesa">M-Pesa</option>
                      <option value="airtel_money">Airtel Money</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full bg-[#0072CE] text-white py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                  >
                    {updating ? (
                      <FiRefreshCw className="animate-spin mr-2" />
                    ) : (
                      <FiCheck className="mr-2" />
                    )}
                    {updating ? 'Mise à jour...' : 'Mettre à jour le profil'}
                  </button>
                </form>
              )}
            </div>

            {/* Security Settings Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiLock className="mr-2" /> Sécurité
                </h2>
                <button
                  onClick={() => toggleSection('security')}
                  className="text-[#0072CE] hover:text-blue-700 transition"
                >
                  {activeSection === 'security' ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>

              {activeSection === 'security' && (
                <div className="pt-4 border-t border-gray-200 space-y-6">
                  {/* Change Email */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-700 flex items-center">
                        <FiMail className="mr-2" /> Changer l&apos;email
                      </h3>
                      <button
                        onClick={() => setChangingEmail(!changingEmail)}
                        className="text-sm text-[#0072CE] hover:underline"
                      >
                        {changingEmail ? 'Annuler' : 'Modifier'}
                      </button>
                    </div>
                    {changingEmail && (
                      <form onSubmit={handleChangeEmail} className="mt-2 space-y-3">
                        <input
                          type="email"
                          placeholder="Nouvel email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                          required
                        />
                        <button
                          type="submit"
                          disabled={updating}
                          className="w-full bg-[#0072CE] text-white py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          {updating ? 'Envoi...' : 'Changer l\'email'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Change Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-700 flex items-center">
                        <FiLock className="mr-2" /> Changer le mot de passe
                      </h3>
                      <button
                        onClick={() => setChangingPassword(!changingPassword)}
                        className="text-sm text-[#0072CE] hover:underline"
                      >
                        {changingPassword ? 'Annuler' : 'Modifier'}
                      </button>
                    </div>
                    {changingPassword && (
                      <form onSubmit={handleChangePassword} className="mt-2 space-y-3">
                        <input
                          type="password"
                          placeholder="Mot de passe actuel"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                        />
                        <input
                          type="password"
                          placeholder="Nouveau mot de passe (≥6 caractères)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                          required
                        />
                        <input
                          type="password"
                          placeholder="Confirmer le nouveau mot de passe"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                          required
                        />
                        <button
                          type="submit"
                          disabled={updating}
                          className="w-full bg-[#0072CE] text-white py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          {updating ? 'Changement...' : 'Changer le mot de passe'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Section Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiCreditCard className="mr-2" /> Gestion des Paiements
                </h2>
                <button
                  onClick={() => toggleSection('payments')}
                  className="text-[#0072CE] hover:text-blue-700 transition"
                >
                  {activeSection === 'payments' ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>

              {activeSection === 'payments' && (
                <form onSubmit={handleTransactionRequest} className="pt-4 border-t border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de transaction</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setRequestType('deposit')}
                        className={`flex-1 py-3 rounded-lg border transition ${requestType === 'deposit' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}
                      >
                        <FiArrowDown className="inline mr-2" /> Dépôt
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestType('withdraw')}
                        className={`flex-1 py-3 rounded-lg border transition ${requestType === 'withdraw' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}
                      >
                        <FiArrowUp className="inline mr-2" /> Retrait
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (CDF)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Raison (optionnel)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#0072CE] focus:border-[#0072CE]"
                      rows={2}
                      placeholder="Décrivez la raison de cette transaction"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updating || amount <= 0}
                    className="w-full bg-congoleseYellow text-[#0072CE] py-3 rounded-lg hover:bg-opacity-80 transition flex items-center justify-center font-medium"
                  >
                    <FiDollarSign className="mr-2" />
                    {updating ? 'Traitement...' : `Demander ${requestType === 'deposit' ? 'un dépôt' : 'un retrait'}`}
                  </button>
                </form>
              )}
            </div>

            {/* Transactions Section Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiDollarSign className="mr-2" /> Transactions Récentes
                </h2>
                <button
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="text-[#0072CE] hover:text-blue-700 transition flex items-center"
                >
                  {showTransactions ? (
                    <>
                      <FiChevronUp className="mr-1" /> Masquer
                    </>
                  ) : (
                    <>
                      <FiChevronDown className="mr-1" /> Afficher
                    </>
                  )}
                </button>
              </div>

              {showTransactions && (
                <div className="pt-4 border-t border-gray-200">
                  {transactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune transaction récente.</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((trans) => (
                        <div key={trans.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trans.status)}`}>
                                {getStatusIcon(trans.status)}
                                {trans.status === 'pending' ? 'En attente' : trans.status === 'completed' ? 'Complété' : 'Annulé'}
                              </span>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trans.request_type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {trans.request_type === 'deposit' ? 'Dépôt' : 'Retrait'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(trans.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`text-lg font-semibold ${trans.request_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                {trans.request_type === 'deposit' ? '+' : '-'}{trans.amount.toFixed(2)} CDF
                              </p>
                              {trans.reason && (
                                <p className="text-sm text-gray-600 mt-1">{trans.reason}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Solde avant</p>
                              <p className="text-sm font-medium">{trans.balance_before.toFixed(2)} CDF</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}