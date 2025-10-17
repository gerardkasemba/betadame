'use client'

import { useState, useEffect, useRef } from 'react'
import { loadScript } from '@paypal/paypal-js'
import { CreditCard, Shield, Zap, Info, Lock, ArrowRight, CheckCircle } from 'lucide-react'

interface BuyBalanceTabProps {
  buyBalanceAmount: string
  agentBalance: number
  isProcessing: boolean
  onAmountChange: (amount: string) => void
  onSubmit: (e: React.FormEvent) => void
  onPaymentSuccess?: (amount: number, orderId: string) => void
}

export function BuyBalanceTab({
  buyBalanceAmount,
  agentBalance,
  isProcessing,
  onAmountChange,
  onSubmit,
  onPaymentSuccess
}: BuyBalanceTabProps) {
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [paypalError, setPaypalError] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [lastAmount, setLastAmount] = useState<string>('')
  const paypalButtonsRef = useRef<any>(null)

  // Quick amount buttons
  const quickAmounts = [20, 50, 100, 200, 500]

  // Clean up PayPal buttons
  const cleanupPayPalButtons = () => {
    const container = document.getElementById('paypal-button-container')
    if (container) {
      container.innerHTML = ''
    }
    paypalButtonsRef.current = null
  }

  // Initialize PayPal buttons
  const initializePayPal = async () => {
    try {
      const amount = parseFloat(buyBalanceAmount)
      
      // Validate amount
      if (isNaN(amount) || amount < 10) {
        return
      }

      // Don't reinitialize if amount hasn't changed
      if (lastAmount === buyBalanceAmount && paypalButtonsRef.current) {
        return
      }

      setPaypalLoading(true)
      setPaypalError(null)
      setPaymentSuccess(false)

      // Clean up existing buttons
      cleanupPayPalButtons()

      const paypal = await loadScript({
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: 'USD',
        components: 'buttons',
        // Enable all funding sources (PayPal account, cards, etc.)
        // Don't disable any funding sources
        disableFunding: undefined, // Allows all payment methods
        enableFunding: 'paylater,venmo', // Enable additional payment methods
      })

      if (!paypal?.Buttons) {
        throw new Error('PayPal SDK non chargé')
      }

      const buttons = paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 45,
          tagline: false
        },

        // IMPORTANT: This enables both PayPal account and card payments
        fundingSource: undefined, // Don't restrict funding source

        createOrder: async (data, actions) => {
          try {
            setPaypalError(null)
            
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: amount,
                currency: 'USD',
                description: `Recharge solde agent - ${amount}$`,
              }),
            })

            const orderData = await response.json()
            
            if (!response.ok) {
              throw new Error(orderData.error || 'Erreur lors de la création de la commande')
            }

            console.log('Order created:', orderData.id)
            return orderData.id
          } catch (error) {
            console.error('Error creating order:', error)
            setPaypalError(error instanceof Error ? error.message : 'Erreur lors de la création de la commande')
            throw error
          }
        },

        onApprove: async (data, actions) => {
          try {
            setPaypalLoading(true)
            
            console.log('Capturing order:', data.orderID)
            
            const response = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: data.orderID,
                amount: amount,
              }),
            })

            const captureData = await response.json()
            
            if (!response.ok) {
              throw new Error(captureData.error || 'Erreur lors de la capture du paiement')
            }

            console.log('Payment captured successfully:', captureData)

            // Mark payment as successful
            setPaymentSuccess(true)
            
            // Call success callback if provided
            if (onPaymentSuccess) {
              onPaymentSuccess(amount, data.orderID)
            }

            // Trigger form submission to update agent balance
            setTimeout(() => {
              const form = document.getElementById('buyBalanceForm') as HTMLFormElement
              if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
              }
            }, 500)

          } catch (error) {
            console.error('Error capturing order:', error)
            setPaypalError(error instanceof Error ? error.message : 'Erreur lors du traitement du paiement')
            setPaymentSuccess(false)
          } finally {
            setPaypalLoading(false)
          }
        },

        onError: (err) => {
          console.error('PayPal Error:', err)
          setPaypalError('Erreur PayPal: Veuillez réessayer')
          setPaypalLoading(false)
        },

        onCancel: (data) => {
          console.log('Payment cancelled:', data)
          setPaypalError('Paiement annulé par l\'utilisateur')
          setPaypalLoading(false)
        }
      })

      await buttons.render('#paypal-button-container')
      paypalButtonsRef.current = buttons
      setLastAmount(buyBalanceAmount)

    } catch (error) {
      console.error('Failed to initialize PayPal:', error)
      setPaypalError('Erreur lors de l\'initialisation de PayPal')
    } finally {
      setPaypalLoading(false)
    }
  }

  // Handle amount change
  const handleAmountChange = (amount: string) => {
    onAmountChange(amount)
    setPaypalError(null)
    setPaymentSuccess(false)
  }

  // Set quick amount
  const setQuickAmount = (amount: number) => {
    handleAmountChange(amount.toString())
  }

  // Initialize PayPal when amount is valid and different
  useEffect(() => {
    if (buyBalanceAmount && parseFloat(buyBalanceAmount) >= 10) {
      const timer = setTimeout(() => {
        initializePayPal()
      }, 800) // Debounce to avoid too many re-renders

      return () => {
        clearTimeout(timer)
      }
    } else {
      cleanupPayPalButtons()
    }

    return () => {
      // Cleanup on unmount
      cleanupPayPalButtons()
    }
  }, [buyBalanceAmount])

  const selectedAmount = parseFloat(buyBalanceAmount) || 0
  const newBalance = agentBalance + selectedAmount

  return (
    <div className="space-y-4">
      {/* Current Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Solde Plateforme Agent</span>
          </div>
          <Zap className="h-5 w-5" />
        </div>
        <div className="text-3xl font-bold mb-1">{agentBalance.toFixed(2)}$</div>
        <div className="text-blue-100 text-sm">Solde disponible pour approuver les dépôts</div>
      </div>

      {/* Success Message */}
      {paymentSuccess && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Paiement réussi !</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            {selectedAmount}$ ont été ajoutés à votre solde plateforme.
          </p>
        </div>
      )}

      {/* Quick Amounts */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-blue-500" />
          Montants rapides
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setQuickAmount(amount)}
              disabled={isProcessing}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                buyBalanceAmount === amount.toString()
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold">{amount}$</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center transition-all"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Custom Amount */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
          Montant personnalisé
        </h3>
        <div className="relative">
          <input
            type="number"
            value={buyBalanceAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="10"
            disabled={isProcessing}
            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
            $
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
          <span>Minimum 10$</span>
          {selectedAmount >= 10 && (
            <span className="text-blue-600 font-semibold">
              Nouveau solde: {newBalance.toFixed(2)}$
            </span>
          )}
        </div>
      </div>

      {/* Payment Section */}
      {buyBalanceAmount && parseFloat(buyBalanceAmount) >= 10 && (
        <div className="bg-white rounded-xl p-4 border-2 border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-green-500" />
              Paiement sécurisé
            </h3>
            <div className="text-sm text-gray-600">
              Montant: <span className="font-bold text-blue-600">{selectedAmount}$</span>
            </div>
          </div>

          {paypalError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-4 animate-shake">
              <p className="text-red-700 text-sm text-center font-medium">{paypalError}</p>
              <button
                onClick={() => {
                  setPaypalError(null)
                  initializePayPal()
                }}
                className="mt-2 w-full text-xs text-red-600 hover:text-red-800 underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {paypalLoading ? (
            <div className="flex flex-col justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
              <span className="text-gray-600 font-medium">Chargement PayPal...</span>
              <span className="text-gray-400 text-sm mt-1">Veuillez patienter</span>
            </div>
          ) : (
            <div id="paypal-button-container" className="min-h-[45px]">
              {/* PayPal buttons will be rendered here */}
            </div>
          )}

          <div className="flex items-center justify-center mt-3 space-x-2 text-xs text-gray-500">
            <Shield className="h-3 w-3 text-green-500" />
            <span>Paiement 100% sécurisé par</span>
            <span className="font-bold text-blue-600">PayPal</span>
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 text-center font-medium mb-2">
              💡 Méthodes de paiement acceptées
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-blue-600">
              <span className="bg-white px-2 py-1 rounded border border-blue-200">PayPal Balance</span>
              <span className="bg-white px-2 py-1 rounded border border-blue-200">Carte bancaire</span>
              <span className="bg-white px-2 py-1 rounded border border-blue-200">Débit</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 animate-fade-in shadow-sm">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Comment ça marche ?
          </h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Le solde plateforme sert à approuver les dépôts des utilisateurs</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Gagnez 2.5% de commission sur chaque retrait approuvé</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Paiement instantané et sécurisé via PayPal</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Aucun frais de transaction - vous recevez 100% du montant</span>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-2 text-green-600 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-semibold">Instantané</span>
          </div>
          <p className="text-xs text-gray-600">Crédit immédiat après paiement</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-2 text-blue-600 mb-1">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-semibold">Sécurisé</span>
          </div>
          <p className="text-xs text-gray-600">Protection PayPal activée</p>
        </div>
      </div>

      {/* Support Info */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
        <div className="text-sm text-gray-700 font-medium mb-1">Besoin d'aide ?</div>
        <div className="text-xs text-gray-600">
          Contactez le support au{' '}
          <a href="tel:+15551234567" className="text-blue-600 font-semibold hover:underline">
            +1 (555) 123-4567
          </a>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Disponible 24/7 pour vous assister
        </div>
      </div>

      {/* Hidden form for submission */}
      <form 
        id="buyBalanceForm" 
        onSubmit={onSubmit} 
        className="hidden"
      >
        <input type="hidden" name="amount" value={buyBalanceAmount} />
      </form>
    </div>
  )
}

// Add these styles to your global CSS
const styles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-shake {
  animation: shake 0.3s ease-out;
}
`