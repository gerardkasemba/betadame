'use client'

import { useEffect, useState } from 'react'
import { useToast, Toast as ToastType } from '@/contexts/ToastContext'
import { 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle, 
  X,
  DollarSign,
  User
} from 'lucide-react'

interface ToastProps {
  toast: ToastType
}

export function Toast({ toast }: ToastProps) {
  const { removeToast } = useToast()
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => removeToast(toast.id), 300)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => removeToast(toast.id), 300)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        w-80 ${getBackgroundColor()} border rounded-xl shadow-lg p-4 mb-3
        backdrop-blur-sm bg-opacity-95
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {toast.title}
            </h4>
            <button
              onClick={handleClose}
              className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              <X className="h-3 w-3 text-gray-500" />
            </button>
          </div>

          {/* Amount Display (for money transfers) */}
          {toast.amount && (
            <div className="flex items-center mb-2">
              <div className="bg-green-100 rounded-full p-1 mr-2">
                <DollarSign className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-lg font-bold text-green-600">
                +{toast.amount.toFixed(2)}$
              </span>
            </div>
          )}

          {/* Sender Info */}
          {toast.sender && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <User className="h-3 w-3 mr-1" />
              <span className="font-medium">De: </span>
              <span className="ml-1 truncate">{toast.sender}</span>
            </div>
          )}

          {/* Message */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {toast.message}
          </p>

          {/* Progress Bar */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div
              className={`
                h-1 rounded-full transition-all duration-100 ease-linear
                ${toast.type === 'success' ? 'bg-green-500' : ''}
                ${toast.type === 'error' ? 'bg-red-500' : ''}
                ${toast.type === 'warning' ? 'bg-yellow-500' : ''}
                ${toast.type === 'info' ? 'bg-blue-500' : ''}
              `}
              style={{ 
                width: isLeaving ? '0%' : '100%',
                transition: isLeaving ? 'width 0.3s ease-in' : 'width 5s linear'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}