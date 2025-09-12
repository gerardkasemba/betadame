"use client";
import { useState } from 'react';
import { FaGamepad, FaClock, FaCoins, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import JoinButton from './JoinButton';

interface MobileGameFooterProps {
  isYourTurn: boolean;
  timeLeft: number;
  stake: number;
  waitingTime?: number;
  opponentEmail: string;
  playerRole: 'black' | 'red' | 'spectator';
  onJoin: () => void;
  showJoinButton: boolean;
  isComputerMode: boolean; // Added for consistency
}

export default function MobileGameFooter({
  isYourTurn,
  timeLeft,
  stake,
  waitingTime,
  opponentEmail,
  playerRole,
  onJoin,
  showJoinButton,
  isComputerMode, // Now accepted
}: MobileGameFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Optional: Use isComputerMode here if needed, e.g., for opponent display
  const displayOpponent = isComputerMode ? 'Ordinateur' : opponentEmail;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg z-20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className={`p-1 rounded-full mr-2 ${isYourTurn ? 'bg-green-100' : 'bg-gray-100'}`}>
              <FaGamepad className={isYourTurn ? 'text-green-600' : 'text-gray-400'} size={16} />
            </div>
            <span className="text-sm font-medium">{isYourTurn ? 'Votre tour' : 'Tour adverse'}</span>
          </div>

          {isYourTurn && (
            <div className="flex items-center">
              <FaClock className={`mr-1 ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-600'}`} size={14} />
              <span className={`text-sm font-medium ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                {timeLeft}s
              </span>
            </div>
          )}

          {/* Waiting Timer */}
          {waitingTime !== undefined && waitingTime > 0 && (
            <div className="flex items-center">
              <FaClock className="text-yellow-500 mr-1" size={14} />
              <span className="text-sm font-medium text-yellow-600">{waitingTime}s</span>
            </div>
          )}

          <div className="flex items-center">
            <FaCoins className="text-amber-500 mr-1" size={14} />
            <span className="text-sm font-medium">{stake} CDF</span>
          </div>

          <div className="ml-2">
            {isExpanded ? (
              <FaChevronDown className="text-gray-500" size={14} />
            ) : (
              <FaChevronUp className="text-gray-500" size={14} />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-40 z-10" onClick={() => setIsExpanded(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-5 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Détails de la partie</h3>
              <button onClick={() => setIsExpanded(false)} className="p-1 rounded-full bg-gray-100">
                <FaChevronDown className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Vous êtes:</span>
                <span className={`font-semibold ${playerRole === 'black' ? 'text-gray-900' : 'text-red-600'}`}>
                  {playerRole === 'black' ? 'Noir' : playerRole === 'red' ? 'Rouge' : 'Spectateur'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Adversaire:</span>
                <span className="font-medium">{displayOpponent}</span> {/* Uses isComputerMode */}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tour actuel:</span>
                <span className={isYourTurn ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                  {isYourTurn ? 'Votre tour' : 'Tour adverse'}
                </span>
              </div>

              {isYourTurn && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Temps restant:</span>
                  <span className={timeLeft <= 10 ? 'text-red-500 font-semibold' : 'text-gray-800'}>
                    {timeLeft} secondes
                  </span>
                </div>
              )}

              {/* Waiting Timer in Modal */}
              {waitingTime !== undefined && waitingTime > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Attente:</span>
                  <span className="text-yellow-600 font-semibold">{waitingTime} secondes</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Mise:</span>
                <span className="font-medium">{stake} CDF</span>
              </div>
            </div>

            {showJoinButton && (
                <div className="w-full mt-6" >
                    <JoinButton onClick={onJoin} />
                </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}