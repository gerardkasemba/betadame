'use client';
import { useSupabase } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';
import { Transaction, RawTransaction } from '@/types';

const ADMIN_USER_ID = 'a9f80596-2373-4343-bdfa-8b9c0eee84c4';
type TransactionStatus = "pending" | "completed" | "canceled";

export default function AdminTransactions() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null>(null);
  const [transactions, setTransactions] = useState<(Transaction & { user_email: string })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<{ [key: number]: string }>({});
  const [reasonUpdates, setReasonUpdates] = useState<{ [key: number]: string }>({});
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'canceled'>('all');

  useEffect(() => {
    async function fetchUserAndTransactions() {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(currentUser);

        if (currentUser && currentUser.id === ADMIN_USER_ID) {
          // Fetch all transactions with user email
          const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select(`
              id,
              user_id,
              balance_before,
              request_type,
              amount,
              status,
              reason,
              created_at,
              processed_at,
              users (email)
            `)
            .order('created_at', { ascending: false });

          if (transError) throw transError;

          // Transform data to include user_email with null safety
          const transformedData = transData?.map((trans: RawTransaction) => ({
            id: trans.id,
            user_id: trans.user_id,
            balance_before: trans.balance_before,
            request_type: trans.request_type,
            amount: trans.amount,
            status: trans.status,
            reason: trans.reason,
            created_at: trans.created_at,
            processed_at: trans.processed_at,
            user_email: trans.users[0]?.email ?? "",
          })) || [];

          setTransactions(transformedData);
        } else {
          setError('Accès refusé : réservé à l’administrateur.');
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

    fetchUserAndTransactions();
  }, [supabase]);

  const handleUpdateTransaction = async (transactionId: number, e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(transactionId);
    try {
      const transaction = transactions.find((t) => t.id === transactionId);
      if (!transaction) {
        throw new Error('Transaction non trouvée');
      }

      const newStatus = statusUpdates[transactionId] || transaction.status;
      const newReason = reasonUpdates[transactionId] || transaction.reason || null;

      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus, reason: newReason })
        .eq('id', transactionId);

      if (error) throw error;

      // Update local state
      setTransactions((prev) =>
        prev.map((trans) =>
          trans.id === transactionId
            ? {
                ...trans,
                status: newStatus as TransactionStatus,
                reason: newReason,
              }
            : trans
        )
      );
      
      // Clear the update states
      setStatusUpdates(prev => {
        const newState = {...prev};
        delete newState[transactionId];
        return newState;
      });
      
      setReasonUpdates(prev => {
        const newState = {...prev};
        delete newState[transactionId];
        return newState;
      });
      
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (activeTab === 'all') return true;
    return transaction.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeColor = (type: string) => {
    return type === 'deposit' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0072CE] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des transactions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-md w-full text-center">
          <div className="text-[#CE1126] text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Non connecté</h1>
          <p className="text-gray-600">Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (user.id !== ADMIN_USER_ID) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-md w-full text-center">
          <div className="text-[#CE1126] text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h1>
          <p className="text-gray-600">Cette page est réservée à l&apos;administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestion des Transactions</h1>
          <p className="text-gray-600 mt-1">Interface administrateur</p>
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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto -mb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-6 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === 'all' ? 'border-[#0072CE] text-[#0072CE]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Toutes
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-6 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === 'pending' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                En attente
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-4 px-6 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === 'completed' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Complétées
              </button>
              <button
                onClick={() => setActiveTab('canceled')}
                className={`py-4 px-6 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === 'canceled' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Annulées
              </button>
            </nav>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune transaction</h3>
            <p className="mt-1 text-gray-500">Aucune transaction à afficher pour le moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((trans) => (
                    <tr key={trans.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{trans.user_email}</div>
                        <div className="text-sm text-gray-500">Solde avant: {trans.balance_before?.toFixed(2) || '0.00'} CDF</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRequestTypeColor(trans.request_type)}`}>
                          {trans.request_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{trans.amount?.toFixed(2) || '0.00'} CDF</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(trans.status)}`}>
                          {trans.status === 'pending' ? 'En attente' : trans.status === 'completed' ? 'Complété' : 'Annulé'}
                        </span>
                        {trans.reason && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs">{trans.reason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(trans.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <form onSubmit={(e) => handleUpdateTransaction(trans.id, e)} className="space-y-2">
                          <select
                            value={statusUpdates[trans.id] || trans.status}
                            onChange={(e) => setStatusUpdates({ ...statusUpdates, [trans.id]: e.target.value })}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0072CE] focus:border-[#0072CE] sm:text-sm rounded-md"
                          >
                            <option value="pending">En attente</option>
                            <option value="completed">Complété</option>
                            <option value="canceled">Annulé</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Raison (optionnel)"
                            value={reasonUpdates[trans.id] || trans.reason || ''}
                            onChange={(e) => setReasonUpdates({ ...reasonUpdates, [trans.id]: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#0072CE] focus:border-[#0072CE] sm:text-sm"
                          />
                          <button
                            type="submit"
                            disabled={updating === trans.id}
                            className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0072CE] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0072CE] disabled:opacity-50"
                          >
                            {updating === trans.id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Mise à jour...
                              </>
                            ) : 'Mettre à jour'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {filteredTransactions.map((trans) => (
                <div key={trans.id} className="border-b border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{trans.user_email}</div>
                      <div className="text-sm text-gray-500">{new Date(trans.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(trans.status)}`}>
                      {trans.status === 'pending' ? 'En attente' : trans.status === 'completed' ? 'Complété' : 'Annulé'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">Type</div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRequestTypeColor(trans.request_type)}`}>
                        {trans.request_type.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Montant</div>
                      <div className="font-medium">{trans.amount?.toFixed(2) || '0.00'} CDF</div>
                    </div>
                  </div>
                  
                  <div className="text-sm mb-3">
                    <div className="text-gray-500">Solde avant: {trans.balance_before?.toFixed(2) || '0.00'} CDF</div>
                    {trans.reason && (
                      <div className="text-gray-700 mt-1">Raison: {trans.reason}</div>
                    )}
                  </div>
                  
                  <form onSubmit={(e) => handleUpdateTransaction(trans.id, e)} className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                    <select
                      value={statusUpdates[trans.id] || trans.status}
                      onChange={(e) => setStatusUpdates({ ...statusUpdates, [trans.id]: e.target.value })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0072CE] focus:border-[#0072CE] sm:text-sm rounded-md"
                    >
                      <option value="pending">En attente</option>
                      <option value="completed">Complété</option>
                      <option value="canceled">Annulé</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Raison (optionnel)"
                      value={reasonUpdates[trans.id] || trans.reason || ''}
                      onChange={(e) => setReasonUpdates({ ...reasonUpdates, [trans.id]: e.target.value })}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#0072CE] focus:border-[#0072CE] sm:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={updating === trans.id}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0072CE] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0072CE] disabled:opacity-50"
                    >
                      {updating === trans.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Mise à jour...
                        </>
                      ) : 'Mettre à jour'}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}