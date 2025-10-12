// app/dashboard/agent/components/MessageAlert.tsx
import { CheckCircle, XCircle } from 'lucide-react'

interface MessageAlertProps {
  message: { type: 'success' | 'error'; text: string } | null
}

export function MessageAlert({ message }: MessageAlertProps) {
  if (!message) return null

  return (
    <div className={`mb-6 p-4 rounded-lg ${
      message.type === 'success' 
        ? 'bg-green-50 text-green-800 border border-green-200' 
        : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      <div className="flex items-center">
        {message.type === 'success' ? (
          <CheckCircle className="h-5 w-5 mr-2" />
        ) : (
          <XCircle className="h-5 w-5 mr-2" />
        )}
        {message.text}
      </div>
    </div>
  )
}